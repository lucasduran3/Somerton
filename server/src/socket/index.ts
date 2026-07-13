import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { registerRoomHandlers } from './room.handlers.js';

let io: Server;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer);

  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
  });
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
