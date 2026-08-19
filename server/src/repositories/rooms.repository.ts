import { Room } from '../types/socket.types.js';
import redis from '../db/redis.js';
import { AppError } from '../shared/errors/AppError.js';

export async function createRoom(room: Room): Promise<void> {
  const multi = redis.multi();
  multi.set(`room:${room.id}`, JSON.stringify(room), 'EX', room.duration * 60);
  multi.set(`room:movie:${room.movie.id}`, room.id, 'EX', room.duration * 60);
  multi.zadd(`rooms:active`, room.createdAt, room.id);

  if (!(room.users.length >= room.maxUsers)) {
    multi.zadd(`rooms:available`, room.createdAt, room.id);
  }

  await multi.exec();
}

export async function deleteRoom(
  roomId: string,
  movieId: number,
): Promise<void> {
  await redis
    .multi()
    .del(`room:${roomId}`, `room:movie:${movieId}`)
    .zrem(`rooms:available`, roomId)
    .zrem(`rooms:active`, roomId)
    .exec();
}

export async function setRoomCache(room: Room): Promise<void> {
  const ttl = await redis.ttl(`room:${room.id}`);

  if (ttl < 0) {
    throw new AppError('The room no longer exists.', 404);
  }

  await redis.set(`room:${room.id}`, JSON.stringify(room), 'EX', ttl, 'XX');
}

export async function updateRoom(room: Room): Promise<void> {
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

export async function getActiveRooms(
  start: number,
  end: number,
): Promise<string[]> {
  return await redis.zrevrange('rooms:active', start, end);
}

export async function getAvailableRooms(
  start: number,
  end: number,
): Promise<string[]> {
  return await redis.zrevrange('rooms:available', start, end);
}
