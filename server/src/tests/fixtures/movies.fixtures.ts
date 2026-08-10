export const createMovie = (overrides = {}) => ({
  id: 1,
  title: 'Movie 1',
  poster_path: null,
  overview: '',
  genre_ids: [1, 2],
  release_date: '2020-01-01',
  ...overrides,
});

export const createMovieDetail = (overrides = {}) => ({
  id: 1,
  title: 'Movie 1',
  overview: '',
  poster_path: null,
  genres: [
    { id: 1, name: 'terror' },
    { id: 2, name: 'suspenso' },
  ],
  release_date: '2020-01-01',
  ...overrides,
});

export const createSearchIndex = (overrides = {}) => ({
  ids: [],
  page: 1,
  total_pages: 1,
  total_results: 0,
  ...overrides,
});

export const createTMDBResponse = (overrides = {}) => ({
  page: 1,
  results: [],
  total_pages: 1,
  total_results: 0,
  ...overrides,
});

export const createGenre = (overrides = {}) => ({
  id: 1,
  name: 'genre 1',
});
