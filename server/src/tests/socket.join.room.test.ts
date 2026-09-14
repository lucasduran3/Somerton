import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket, io } from 'socket.io-client';
import * as roomsRepository from '../repositories/rooms.repository.js';
import { registerRoomHandlers } from '../socket/room.handlers.js';

vi.mock('../repositories/rooms.repository.js');

describe('room:join:event', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: Server;
  let clientSocket: ClientSocket;

  beforeEach(() => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      ioServer = new Server(httpServer);
      ioServer.on('connection', (socket) => {
        registerRoomHandlers(ioServer, socket);
      });

      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        clientSocket = ioClient(`http://localhost:${port}`);
        clientSocket.on('connect', resolve);
      });
    });
  });

  afterEach(() => {
    ioServer.close();
    clientSocket.close();
    vi.resetAllMocks();
  });

  it('The room should be updated when an user joins', () => {
    return new Promise<void>((resolve) => {
      vi.mocked(roomsRepository.getRoomById).mockResolvedValue({
        id: '1',
        movie: {
          id: 1,
          title: 'test movie',
          overview: 'test overview',
          poster_path: null,
          genre_ids: [],
          release_date: '2026-02-02',
        },
        duration: 3600,
        maxUsers: 5,
        ownerId: '4',
        users: ['user1', 'user2'],
        messages: [{ userId: '4', text: 'message1', sentAt: 1 }],
        createdAt: 1,
      });

      clientSocket.emit('room:join', { roomId: '1' });

      clientSocket.on('room:joined', (room) => {
        expect(room.ownerId).toBe('4');
        expect(room.users.length).toBe(3);
        expect(roomsRepository.updateRoom).toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('should emit room:full if the room is full when the user attempts to join', () => {
    return new Promise<void>((resolve) => {
      vi.mocked(roomsRepository.getRoomById).mockResolvedValue({
        id: '1',
        movie: {
          id: 1,
          title: 'test movie',
          overview: 'test overview',
          poster_path: null,
          genre_ids: [],
          release_date: '2026-02-02',
        },
        duration: 3600,
        maxUsers: 2,
        ownerId: '4',
        users: ['user1', 'user2'],
        messages: [{ userId: '4', text: 'message1', sentAt: 1 }],
        createdAt: 1,
      });

      clientSocket.emit('room:join', { roomId: '1' });

      clientSocket.on('room:full', (payload) => {
        expect(payload.message).toBe('The room is full.');
        resolve();
      });
    });
  });
});
