import { roomsRepository } from '../repositories/rooms.repository.js';
import { Room } from '../types/socket.types.js';

async function getAllRooms(page: number, pageSize: number): Promise<Room[]> {
  if (pageSize <= 0 || page <= 0) return [];
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const roomsIds = await roomsRepository.getActiveRooms(start, end);
  return await roomsRepository.getRoomsByIds(roomsIds);
}

async function searchRooms(filters: {
  movieTitle?: string;
  isAvailable?: boolean;
  page: number;
  pageSize: number;
}): Promise<Room[]> {
  if (filters.pageSize <= 0 || filters.page <= 0) return [];

  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize - 1;

  if (filters.movieTitle) {
    const roomsIds = await getRoomIdsIndex(filters.isAvailable, 0, -1);

    const hydratedRooms = await roomsRepository.getRoomsByIds(roomsIds);
    const query = filters.movieTitle.toLowerCase();

    const filteredRooms = hydratedRooms.filter((room) =>
      room.movie.title.toLowerCase().includes(query),
    );

    return filteredRooms.slice(start, start + filters.pageSize);
  }

  const roomsIds = await getRoomIdsIndex(filters.isAvailable, start, end);
  return await roomsRepository.getRoomsByIds(roomsIds);
}

async function getRoomIdsIndex(
  isAvailable: boolean | undefined,
  start: number,
  end: number,
): Promise<string[]> {
  return isAvailable
    ? roomsRepository.getAvailableRooms(start, end)
    : roomsRepository.getActiveRooms(start, end);
}

export const roomsService = {
  getAllRooms,
  searchRooms,
};
