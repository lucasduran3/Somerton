import { Room, RoomSummary } from '../types/socket.types.js';
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

export async function getTotalOfRooms(onlyAvailable: boolean): Promise<number> {
  return await redis.zcard(onlyAvailable ? 'rooms:available' : 'rooms:active');
}

export async function getRoomsByIds(
  roomsIds: string[],
): Promise<RoomSummary[]> {
  if (roomsIds.length === 0) return [];

  const pipeline = redis.pipeline();
  roomsIds.forEach((id) => {
    pipeline.get(`room:${id}`).ttl(`room:${id}`);
  });

  try {
    let rawRooms = await pipeline.exec();
    if (!rawRooms) return [];

    const roomsSummary: RoomSummary[] = [];

    for (let i = 0; i < rawRooms.length; i += 2) {
      const [getError, rawRoom] = rawRooms[i];
      const [ttlError, ttl] = rawRooms[i + 1];

      const isValid =
        !getError &&
        !ttlError &&
        typeof rawRoom === 'string' &&
        typeof ttl === 'number' &&
        ttl > 0;

      if (isValid) {
        const room = JSON.parse(rawRoom) as Room;
        roomsSummary.push({
          id: room.id,
          isAvailable: room.users.length < room.maxUsers,
          movieTitle: room.movie.title,
          remainingTime: Math.floor(ttl / 60),
        });
      }
    }

    rawRooms = null;

    return roomsSummary;
  } catch (error) {
    console.error('Error al obtener salas por id en cache:', error);
    throw new AppError('Error un error al intentar buscar salas.', 500);
  }
}

export async function getRoomById(roomId: string): Promise<Room> {
  const room = await redis.get(`room:${roomId}`);
  if (!room) {
    throw new AppError('The room does not exist.', 404);
  }
  return JSON.parse(room);
}

export async function movieAlreadyTaken(movieId: number): Promise<boolean> {
  const movieKey = await redis.get(`room:movie:${movieId}`);
  return movieKey !== null;
}
