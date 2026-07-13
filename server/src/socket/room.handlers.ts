import { Server, Socket } from 'socket.io';
import redis from '../db/redis.js';
import { CreateRoomData, Message, Room } from '../types/socket.types.js';
import { randomUUID } from 'crypto';

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
  socket.on('disconnect', async () => {
    const roomId = socket.data.roomId;
    await disconnectFromRoom(io, socket, roomId);
  });
}

/**
 * 
  ---------- HANDLERS ------------
 */
async function createRoomHandler(socket: Socket, data: CreateRoomData) {
  if (socket.rooms.size > 1) {
    socket.emit('room:already-in-room', {
      message: 'You are already in a room.',
    });
    return;
  }

  const movieKey = await redis.get(`room:movie:${data.movieId}`);
  if (movieKey) {
    socket.emit('room:movie-taken', {
      message: 'There is already a room for this movie.',
    });
    return;
  }

  const room: Room = {
    id: randomUUID(),
    movieId: data.movieId,
    duration: data.duration,
    maxUsers: data.maxUsers,
    ownerId: socket.id,
    users: [socket.id],
    messages: [],
    createdAt: Date.now(),
  };

  try {
    await redis
      .multi()
      .set(`room:${room.id}`, JSON.stringify(room), 'EX', room.duration * 60)
      .set(`room:movie:${room.movieId}`, room.id, 'EX', room.duration * 60)
      .set(`room:owner:${socket.id}`, room.id, 'EX', room.duration * 60)
      .exec();
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

  const room = await redis.get(`room:${data.roomId}`);
  if (!room) {
    socket.emit('room:error', { message: 'The room does not exist.' });
    return;
  }
  const parsedRoom: Room = JSON.parse(room);

  if (parsedRoom.users.length >= parsedRoom.maxUsers) {
    socket.emit('room:full', { message: 'The room is full.' });
    return;
  }

  parsedRoom.users.push(socket.id);
  const ttl = await redis.ttl(`room:${data.roomId}`);
  try {
    await redis.set(
      `room:${data.roomId}`,
      JSON.stringify(parsedRoom),
      'EX',
      ttl,
      'XX',
    );

    await socket.join(data.roomId);
    socket.data.roomId = data.roomId;

    socket.emit('room:joined', parsedRoom);
    socket.to(data.roomId).emit('room:user-joined', { userId: socket.id });
  } catch (error) {
    socket.emit('room:error', {
      message: 'Error while trying to enter the room.',
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

  const room = await redis.get(`room:${data.roomId}`);
  if (!room) {
    socket.emit('room:error', { message: 'The room does not exist.' });
    return;
  }
  const parsedRoom: Room = JSON.parse(room);

  const isOwner = await redis.exists(`room:owner:${socket.id}`);
  if (isOwner) {
    try {
      await closeRoom(io, parsedRoom);
    } catch (error) {
      socket.emit('room:error', {
        message: 'Error while trying to close the room.',
      });
    }
    return;
  }

  parsedRoom.users = parsedRoom.users.filter((e) => e !== socket.id);

  const ttl = await redis.ttl(`room:${data.roomId}`);
  try {
    await redis.set(
      `room:${data.roomId}`,
      JSON.stringify(parsedRoom),
      'EX',
      ttl,
      'XX',
    );

    await socket.leave(data.roomId);
    socket.emit('room:left', parsedRoom);
    socket.to(data.roomId).emit('room:user-left', { userId: socket.id });
  } catch (error) {
    socket.emit('room:error', {
      message: 'Error while trying to leave the room.',
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

  const room = await redis.get(`room:${data.roomId}`);
  if (!room) {
    socket.emit('room:error', { message: 'The room does not exist.' });
    return;
  }
  const parsedRoom: Room = JSON.parse(room);

  const isOwner = await redis.exists(`room:owner:${socket.id}`);
  if (!isOwner) {
    socket.emit('room:error', {
      message: 'You are not the owner of this room.',
    });
    return;
  }

  try {
    await closeRoom(io, parsedRoom);
  } catch (error) {
    socket.emit('room:error', {
      message: 'Error while trying to close the room.',
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

  const room = await redis.get(`room:${data.roomId}`);
  if (!room) {
    socket.emit('room:error', { message: 'The room does not exist.' });
    return;
  }
  const parsedRoom: Room = JSON.parse(room);

  const sanitized = data.text.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (sanitized.length < 1 || sanitized.length > 4096) {
    socket.emit('message:error', {
      message: 'The message is too short or too long.',
    });
    return;
  }

  const message: Message = {
    userId: socket.id,
    text: sanitized,
    sentAt: Date.now(),
  };

  parsedRoom.messages.push(message);
  const ttl = await redis.ttl(`room:${data.roomId}`);
  try {
    await redis.set(
      `room:${data.roomId}`,
      JSON.stringify(parsedRoom),
      'EX',
      ttl,
      'XX',
    );

    io.in(data.roomId).emit('message:received', message);
  } catch (error) {
    socket.emit('message:error', { message: 'Error trying to send message.' });
  }
}

/**
 * 
  ------------- HELPERS -----------
 */
async function closeRoom(io: Server, room: Room) {
  await redis.del(
    `room:${room.id}`,
    `room:movie:${room.movieId}`,
    `room:owner:${room.ownerId}`,
  );
  io.in(room.id).emit('room:closed');
  io.in(room.id).socketsLeave(room.id);
}
async function disconnectFromRoom(io: Server, socket: Socket, roomId: string) {
  if (!roomId) return;

  const room = await redis.get(`room:${roomId}`);
  if (!room) return;

  const parsedRoom: Room = JSON.parse(room);

  const isOwner = await redis.exists(`room:owner:${socket.id}`);
  if (isOwner) {
    await closeRoom(io, parsedRoom);
    return;
  }

  parsedRoom.users = parsedRoom.users.filter((e) => e !== socket.id);

  const ttl = await redis.ttl(`room:${roomId}`);
  try {
    await redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      'EX',
      ttl,
      'XX',
    );

    await socket.leave(roomId);
    socket.to(roomId).emit('room:user-left', { userId: socket.id });
  } catch (error) {
    socket.to(roomId).emit('room:error', {
      message: 'Error while trying to leave the room.',
    });
  }
}
