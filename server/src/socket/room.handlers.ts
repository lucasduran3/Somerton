import { Server, Socket } from 'socket.io';
import { CreateRoomData, Message, Room } from '../types/socket.types.js';
import { randomUUID } from 'crypto';
import { generateUniqueName } from '../utils/uniqueNameGenerator.js';
import { roomsRepository } from '../repositories/rooms.repository.js';
import { AppError } from '../shared/errors/AppError.js';

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on('room:create', (data: CreateRoomData) =>
    createRoomHandler(socket, data),
  );
  socket.on('room:join', (data: { roomId: string }) =>
    joinRoomHandler(socket, data),
  );
  socket.on('room:leave', (data: { roomId: string }) =>
    leaveRoomHandler(io, socket, data),
  );
  socket.on('room:delete', (data: { roomId: string }) =>
    deleteRoomHandler(io, socket, data),
  );
  socket.on('message:send', (data: { roomId: string; text: string }) =>
    sendMessageHandler(io, socket, data),
  );
  socket.on('room:kick', (data: { roomId: string; userToRemove: string }) => {
    kickUserHandler(io, socket, data);
  });
  socket.on('disconnect', async () => {
    const roomId = socket.data.roomId;
    await disconnectFromRoom(io, socket, roomId);
  });
}

/*
  ---------- HANDLERS ------------
 */
async function createRoomHandler(socket: Socket, data: CreateRoomData) {
  if (socket.rooms.size > 1) {
    socket.emit('room:already-in-room', {
      message: 'You are already in a room.',
    });
    return;
  }

  const movieTaken = await roomsRepository.movieAlreadyTaken(data.movie.id);
  if (movieTaken) {
    socket.emit('room:movie-taken', {
      message: 'There is already a room for this movie.',
    });
    return;
  }

  socket.data.username = generateUniqueName([]);

  const room: Room = {
    id: randomUUID(),
    movie: data.movie,
    duration: data.duration,
    maxUsers: data.maxUsers,
    ownerId: socket.data.username,
    users: [socket.data.username],
    messages: [],
    createdAt: Date.now(),
  };

  try {
    await roomsRepository.createRoom(room);
    await socket.join(room.id);
    socket.emit('room:created', room);
    socket.data.roomId = room.id;
  } catch (error) {
    socket.emit('room:error', { message: 'Error creating room' });
  }
}

async function joinRoomHandler(socket: Socket, data: { roomId: string }) {
  if (socket.rooms.size > 1) {
    socket.emit('room:already-in-room', {
      message: 'You are already in a room.',
    });
    return;
  }

  try {
    const room = await roomsRepository.getRoomById(data.roomId);
    if (room.users.length >= room.maxUsers) {
      socket.emit('room:full', { message: 'The room is full.' });
      return;
    }
    socket.data.username = generateUniqueName(room.users);

    room.users.push(socket.data.username);

    await roomsRepository.updateRoom(room);

    await socket.join(data.roomId);
    socket.data.roomId = data.roomId;

    socket.emit('room:joined', room);
    socket
      .to(data.roomId)
      .emit('room:user-joined', { username: socket.data.username });
  } catch (error) {
    socket.emit('room:error', {
      message:
        error instanceof AppError
          ? error.message
          : 'Error while trying to enter the room.',
    });
  }
}

async function leaveRoomHandler(
  io: Server,
  socket: Socket,
  data: { roomId: string },
) {
  if (!socket.rooms.has(data.roomId)) {
    socket.emit('room:error', { message: 'You are not in this room' });
    return;
  }

  try {
    const room = await roomsRepository.getRoomById(data.roomId);
    const isOwner = socket.data.username === room.ownerId;
    if (isOwner) {
      try {
        await closeRoom(io, room);
      } catch (error) {
        socket.emit('room:error', {
          message: 'Error while trying to close the room.',
        });
      }
      return;
    }
    room.users = room.users.filter((e) => e !== socket.data.username);
    await roomsRepository.updateRoom(room);

    await socket.leave(data.roomId);
    socket.emit('room:left', room);
    socket
      .to(data.roomId)
      .emit('room:user-left', { username: socket.data.username });
  } catch (error) {
    socket.emit('room:error', {
      message:
        error instanceof AppError
          ? error.message
          : 'Error while trying to leave the room.',
    });
  }
}

async function deleteRoomHandler(
  io: Server,
  socket: Socket,
  data: { roomId: string },
) {
  if (!socket.rooms.has(data.roomId)) {
    socket.emit('room:error', { message: 'You are not in this room.' });
    return;
  }

  try {
    const room = await roomsRepository.getRoomById(data.roomId);
    const isOwner = socket.data.username === room.ownerId;
    if (!isOwner) {
      socket.emit('room:error', {
        message: 'You are not the owner of this room.',
      });
      return;
    }
    await closeRoom(io, room);
  } catch (error) {
    socket.emit('room:error', {
      message:
        error instanceof AppError
          ? error.message
          : 'Error while trying to delete the room.',
    });
  }
}

async function sendMessageHandler(
  io: Server,
  socket: Socket,
  data: { roomId: string; text: string },
) {
  if (!socket.rooms.has(data.roomId)) {
    socket.emit('room:error', { message: 'You are not in this room.' });
    return;
  }

  try {
    const room = await roomsRepository.getRoomById(data.roomId);
    const sanitized = data.text.replace(/[\x00-\x1F\x7F]/g, '').trim();

    if (sanitized.length < 1 || sanitized.length > 4096) {
      socket.emit('message:error', {
        message: 'The message is too short or too long.',
      });
      return;
    }

    const message: Message = {
      userId: socket.data.username,
      text: sanitized,
      sentAt: Date.now(),
    };
    room.messages.push(message);
    if (room.messages.length >= 500) {
      room.messages.shift();
    }

    await roomsRepository.setRoomCache(room);
    io.in(data.roomId).emit('message:received', message);
  } catch (error) {
    socket.emit('room:error', {
      message:
        error instanceof AppError
          ? error.message
          : 'Error while trying to send a message.',
    });
  }
}

async function kickUserHandler(
  io: Server,
  socket: Socket,
  data: { roomId: string; userToRemove: string },
) {
  if (!socket.rooms.has(data.roomId)) {
    socket.emit('room:error', { message: 'You are not in this room.' });
    return;
  }

  try {
    const room = await roomsRepository.getRoomById(data.roomId);

    if (socket.data.username !== room.ownerId) {
      socket.emit('room:error', {
        message: 'You are not the owner of the room.',
      });
      return;
    }

    if (data.userToRemove === room.ownerId) {
      socket.emit('room:error', {
        message: 'You can not remove the room owner.',
      });
      return;
    }

    if (!room.users.includes(data.userToRemove)) {
      socket.emit('room:error', {
        message: 'The user to be removed is not in the room.',
      });
      return;
    }

    const sockets = await io.in(data.roomId).fetchSockets();
    const targetSocket = sockets.find(
      (e) => e.data.username === data.userToRemove,
    );
    if (!targetSocket) {
      socket.emit('room:error', {
        message: 'The socket of the user to be removed was not found.',
      });
      return;
    }

    room.users = room.users.filter((e) => e !== data.userToRemove);
    await roomsRepository.updateRoom(room);

    targetSocket.leave(data.roomId);
    targetSocket.emit('room:kicked', {
      message: 'You have been kicked out by the room owner.',
    });

    io.in(data.roomId).emit('room:user-kicked', {
      username: data.userToRemove,
    });
  } catch (error) {
    socket.emit('room:error', {
      message:
        error instanceof AppError
          ? error.message
          : 'Error while trying to kick an user',
    });
  }
}

/*
  ------------- HELPERS -----------
 */
async function closeRoom(io: Server, room: Room) {
  await roomsRepository.deleteRoom(room.id, room.movie.id);
  io.in(room.id).emit('room:closed');
  io.in(room.id).socketsLeave(room.id);
}

async function disconnectFromRoom(io: Server, socket: Socket, roomId: string) {
  if (!roomId) return;

  try {
    const room = await roomsRepository.getRoomById(roomId);

    const isOwner = socket.data.username === room.ownerId;
    if (isOwner) {
      await closeRoom(io, room);
      return;
    }

    room.users = room.users.filter((e) => e !== socket.data.username);

    try {
      await roomsRepository.updateRoom(room);

      await socket.leave(roomId);
      socket
        .to(roomId)
        .emit('room:user-left', { username: socket.data.username });
    } catch (error) {
      socket.to(roomId).emit('room:error', {
        message:
          error instanceof AppError
            ? error.message
            : 'Error while trying to leave the room.',
      });
    }
  } catch (error) {
    return;
  }
}
