import { Room } from '../types/socket.types.js';
import redis from '../db/redis.js';
import { AppError } from '../shared/errors/AppError.js';

async function createRoom(room: Room): Promise<void> {
  const multi = redis.multi();
  multi.set(`room:${room.id}`, JSON.stringify(room), 'EX', room.duration * 60);
  multi.set(`room:movie:${room.movie.id}`, room.id, 'EX', room.duration * 60);
  multi.zadd(`rooms:active`, room.createdAt, room.id);

  if (!(room.users.length >= room.maxUsers)) {
    multi.zadd(`rooms:available`, room.createdAt, room.id);
  }

  await multi.exec();
}

async function deleteRoom(roomId: string, movieId: number): Promise<void> {
  await redis
    .multi()
    .del(`room:${roomId}`, `room:movie:${movieId}`)
    .zrem(`rooms:available`, roomId)
    .zrem(`rooms:active`, roomId)
    .exec();
}

async function setRoomCache(room: Room): Promise<void> {
  const ttl = await redis.ttl(`room:${room.id}`);

  if (ttl < 0) {
    throw new AppError('The room no longer exists.', 404);
  }

  await redis.set(`room:${room.id}`, JSON.stringify(room), 'EX', ttl, 'XX');
}

async function updateRoom(room: Room): Promise<void> {
  const ttl = await redis.ttl(`room:${room.id}`);

  if (ttl < 0) {
    throw new AppError('The room no longer exists.', 404);
  }

  const isFull = room.users.length >= room.maxUsers;

  const multi = redis
    .multi()
    .set(`room:${room.id}`, JSON.stringify(room), 'EX', ttl, 'XX');

  if (isFull) {
    multi.zrem('rooms:available', room.id);
  } else {
    multi.zadd('rooms:available', room.createdAt, room.id);
  }

  await multi.exec();
}

async function getActiveRooms(start: number, end: number): Promise<string[]> {
  return await redis.zrevrange('rooms:active', start, end);
}

async function getAvailableRooms(
  start: number,
  end: number,
): Promise<string[]> {
  return await redis.zrevrange('rooms:available', start, end);
}

async function getTotalOfRooms(onlyAvailable: boolean): Promise<number> {
  return await redis.zcard(onlyAvailable ? 'rooms:available' : 'rooms:active');
}

async function getRoomsByIds(roomsIds: string[]): Promise<Room[]> {
  if (roomsIds.length === 0) return [];

  const pipeline = redis.pipeline();
  roomsIds.forEach((id) => {
    pipeline.get(`room:${id}`);
  });

  try {
    let rawRooms = await pipeline.exec();
    if (!rawRooms) return [];

    const rooms = rawRooms
      .map(([error, result]) => {
        if (error || !result) return null;
        return JSON.parse(result as string) as Room;
      })
      .filter((room): room is Room => room !== null);

    rawRooms = null;

    return rooms;
  } catch (error) {
    console.error('Error al obtener salas por id en cache:', error);
    throw new AppError('Error un error al intentar buscar salas.', 500);
  }
}

export const roomsRepository = {
  createRoom,
  updateRoom,
  deleteRoom,
  setRoomCache,
  getActiveRooms,
  getAvailableRooms,
  getTotalOfRooms,
  getRoomsByIds,
};

//getRoomById, siempre y cuando el ttl > 0
