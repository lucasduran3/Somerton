import { roomsRepository } from '../repositories/rooms.repository.js';
import { roomsService } from '../service/rooms.service.js';
import { createRoom } from './fixtures/rooms.fixtures.js';

beforeEach(() => {
  vi.resetAllMocks();
});

vi.mock('../repositories/rooms.repository.js', () => ({
  roomsRepository: {
    getActiveRooms: vi.fn(),
    getRoomsByIds: vi.fn(),
    getAvailableRooms: vi.fn(),
  },
}));

describe('roomsService', () => {
  describe('getAllRooms', () => {
    const rooms = [
      createRoom({ id: '1' }),
      createRoom({ id: '2' }),
      createRoom({ id: '3' }),
    ];

    it('Should return a list of active Rooms', async () => {
      vi.mocked(roomsRepository.getActiveRooms).mockResolvedValue([
        '1',
        '2',
        '3',
      ]);

      vi.mocked(roomsRepository.getRoomsByIds).mockResolvedValue(rooms);

      const result = await roomsService.getAllRooms(1, 3);

      expect(roomsRepository.getActiveRooms).toHaveBeenCalledWith(0, 2);
      expect(roomsRepository.getRoomsByIds).toHaveBeenCalledWith([
        '1',
        '2',
        '3',
      ]);
      expect(result).toEqual(rooms);
    });

    it('Should return an empty list when pageSize is equals to 0', async () => {
      const result = await roomsService.getAllRooms(1, 0);

      expect(roomsRepository.getActiveRooms).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('searchRooms', () => {
    const rooms = [
      createRoom({ id: '1' }),
      createRoom({ id: '2' }),
      createRoom({ id: '3' }),
    ];

    it('Should retrun all active rooms when the filter isAvailable is false', async () => {
      vi.mocked(roomsRepository.getActiveRooms).mockResolvedValue([
        '1',
        '2',
        '3',
      ]);

      vi.mocked(roomsRepository.getRoomsByIds).mockResolvedValue(rooms);

      const result = await roomsService.searchRooms({
        isAvailable: false,
        page: 1,
        pageSize: 3,
      });

      expect(roomsRepository.getActiveRooms).toHaveBeenCalledWith(0, 2);
      expect(roomsRepository.getRoomsByIds).toHaveBeenCalledWith([
        '1',
        '2',
        '3',
      ]);
      expect(result).toEqual(rooms);
    });

    it('Should return all available rooms when the filter isAvailable is true', async () => {
      vi.mocked(roomsRepository.getAvailableRooms).mockResolvedValue([
        '1',
        '2',
        '3',
      ]);

      vi.mocked(roomsRepository.getRoomsByIds).mockResolvedValue(rooms);

      const result = await roomsService.searchRooms({
        isAvailable: true,
        page: 1,
        pageSize: 3,
      });

      expect(roomsRepository.getAvailableRooms).toHaveBeenCalledWith(0, 2);
      expect(roomsRepository.getRoomsByIds).toHaveBeenCalledWith([
        '1',
        '2',
        '3',
      ]);
      expect(result).toEqual(rooms);
    });

    it('Should return only the rooms whose title matches the movieTitle filter', async () => {
      vi.mocked(roomsRepository.getActiveRooms).mockResolvedValue([
        '1',
        '2',
        '3',
      ]);

      vi.mocked(roomsRepository.getRoomsByIds).mockResolvedValue(rooms);

      const result = await roomsService.searchRooms({
        movieTitle: 'Movie 1',
        isAvailable: false,
        page: 1,
        pageSize: 3,
      });

      expect(roomsRepository.getActiveRooms).toHaveBeenCalledWith(0, -1);
      expect(roomsRepository.getRoomsByIds).toHaveBeenCalledWith([
        '1',
        '2',
        '3',
      ]);
      expect(result).toEqual([rooms[0]]);
    });

    it('Should return an empty array when pageSize filter is equal to 0', async () => {
      const result = await roomsService.searchRooms({
        isAvailable: true,
        page: 1,
        pageSize: 0,
      });

      expect(result).toEqual([]);
    });
  });
});
