import { Room } from '../../types/socket.types.js';

export const createRoom = (overrides: Partial<Room> = {}) => {
  const id = overrides.id ?? '1';

  return {
    id,
    movie: {
      poster_path: null,
      overview: '',
      genre_ids: [1, 2],
      release_date: '2020-01-01',
      ...overrides.movie,

      id: Number(id),
      title: `Movie ${id}`,
    },
    duration: 100,
    maxUsers: 1,
    ownerId: '1',
    users: ['1, 2'],
    messages: [],
    createdAt: Date.now(),
    ...overrides,
  };
};
