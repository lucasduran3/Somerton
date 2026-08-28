import { roomsRepository } from '../repositories/rooms.repository.js';
import { Room } from '../types/socket.types.js';
import { PaginatedResult } from '../types/pagination.types.js';

async function searchRooms(filters: {
  movieTitle?: string;
  isAvailable?: boolean;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<Room>> {
  if (filters.pageSize <= 0 || filters.page <= 0) {
    return {
      data: [],
      page: filters.page,
      pageSize: filters.pageSize,
      total: 0,
    };
  }
  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize - 1;

  if (filters.movieTitle) {
    const roomsIds = await getRoomIdsIndex(filters.isAvailable, 0, -1);

    const hydratedRooms = await roomsRepository.getRoomsByIds(roomsIds);
    const query = filters.movieTitle.toLowerCase();

    const filteredRooms = hydratedRooms.filter((room) =>
      room.movie.title.toLowerCase().includes(query),
    );

    return {
      data: filteredRooms.slice(start, start + filters.pageSize),
      page: filters.page,
      pageSize: filters.pageSize,
      total: filteredRooms.length,
    };
  }

  const [roomsIds, total] = await Promise.all([
    getRoomIdsIndex(filters.isAvailable, start, end),
    roomsRepository.getTotalOfRooms(filters.isAvailable ?? false),
  ]);
  const hydratedRooms = await roomsRepository.getRoomsByIds(roomsIds);

  return {
    data: hydratedRooms,
    page: filters.page,
    pageSize: filters.pageSize,
    total: total,
  };
}

async function getRoomIdsIndex(
  onlyAvailable: boolean | undefined,
  start: number,
  end: number,
): Promise<string[]> {
  return onlyAvailable
    ? roomsRepository.getAvailableRooms(start, end)
    : roomsRepository.getActiveRooms(start, end);
}

export const roomsService = {
  searchRooms,
};
