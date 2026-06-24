import redis from '../db/redis.js';
import { tmdbClient } from '../lib/tmdb.client.js';
import { moviesService } from '../service/movies.service.js';

beforeEach(() => {
  vi.resetAllMocks();
});

vi.mock('../db/redis.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../lib/tmdb.client.js', () => ({
  tmdbClient: {
    get: vi.fn(),
  },
}));

const cachedData = {
  page: 1,
  results: [],
  total_pages: 1,
  total_results: 0,
};

describe('movieService', () => {
  it('Should return cached data when it exists in Redis', async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cachedData));
    const result = await moviesService.searchMovies({ query: 'inception' });
    expect(result).toEqual(cachedData);
    expect(vi.mocked(tmdbClient.get)).not.toHaveBeenCalled();
  });

  it('Should call TMDB client when Redis does not have the value', async () => {
    vi.mocked(tmdbClient.get).mockResolvedValue(cachedData);
    vi.mocked(redis.get).mockResolvedValue(null);
    const result = await moviesService.searchMovies({ query: 'inception' });
    expect(result).toEqual(cachedData);
    expect(vi.mocked(tmdbClient.get)).toHaveBeenCalled();
    expect(vi.mocked(redis.set)).toHaveBeenCalled();
  });
});
