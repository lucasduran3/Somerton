import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import * as roomsRepository from '../repositories/rooms.repository.js';
import { getMovieById } from '../service/movies.service.js';
import { registerRoomHandlers } from '../socket/room.handlers.js';

vi.mock('../repositories/rooms.repository.js');
vi.mock('../service/movies.service.js');

describe('room:create:event', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: Server;
  let clientSocket: ClientSocket;

  beforeEach(() => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      ioServer = new Server(httpServer);
      ioServer.on('connection', (socket) =>
        registerRoomHandlers(ioServer, socket),
      );

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

  it('should create a room and emit room:created with valid data', () => {
    return new Promise<void>((resolve) => {
      vi.mocked(getMovieById).mockResolvedValue({
        id: 1,
        title: 'Test Movie',
        overview: '',
        poster_path: null,
        genre_ids: [],
        release_date: '2024-01-01',
      });
      vi.mocked(roomsRepository.movieAlreadyTaken).mockResolvedValue(false);
      vi.mocked(roomsRepository.createRoom).mockResolvedValue(undefined);

      clientSocket.emit('room:create', {
        movieId: 1,
        duration: 3600,
        maxUsers: 4,
      });

      clientSocket.on('room:created', (room) => {
        expect(room.movie.title).toBe('Test Movie');
        expect(room.maxUsers).toBe(4);
        expect(roomsRepository.createRoom).toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('should emit room:movie-taken when a room with that movie already exists', () => {
    return new Promise<void>((resolve) => {
      vi.mocked(getMovieById).mockResolvedValue({
        id: 1,
        title: 'Test Movie',
        overview: '',
        poster_path: null,
        genre_ids: [],
        release_date: '2024-01-01',
      });
      vi.mocked(roomsRepository.movieAlreadyTaken).mockResolvedValue(true);
      vi.mocked(roomsRepository.createRoom).mockResolvedValue(undefined);

      clientSocket.emit('room:create', {
        movieId: 1,
        duration: 3600,
        maxUsers: 4,
      });

      clientSocket.on('room:movie-taken', (payload) => {
        expect(payload.message).toBe('There is already a room for this movie.');
        expect(roomsRepository.createRoom).not.toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('should emit room:error when the payload is not valid', () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit('room:create', {
        movieId: 'error',
        duration: 3600,
        maxUsers: 4,
      });

      clientSocket.on('room:error', (payload) => {
        expect(payload.message).toBe('Invalid data for creating the room.');
        expect(roomsRepository.createRoom).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
});
