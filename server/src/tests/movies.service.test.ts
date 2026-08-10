import redis from '../db/redis.js';
import { tmdbClient } from '../lib/tmdb.client.js';
import { moviesService } from '../service/movies.service.js';
import {
  createMovie,
  createMovieDetail,
  createTMDBResponse,
  createSearchIndex,
  createGenre,
} from './fixtures/movies.fixtures.js';

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock('../db/redis.js', () => {
  const pipelineMock = {
    get: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  return {
    default: {
      get: vi.fn(),
      set: vi.fn(),
      pipeline: vi.fn(() => pipelineMock),
    },
    pipelineMock, // exportar para usar en tests
  };
});

vi.mock('../lib/tmdb.client.js', () => ({
  tmdbClient: {
    get: vi.fn(),
  },
}));

describe('moviesService', () => {
  describe('searchMovies', () => {
    it('Should return cached data when it exists in Redis', async () => {
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify(createSearchIndex()),
      );
      const result = await moviesService.searchMovies({ query: 'inception' });
      expect(result).toEqual(createTMDBResponse());
      expect(vi.mocked(tmdbClient.get)).not.toHaveBeenCalled();
    });

    it('Should call TMDB client when Redis does not have the value', async () => {
      vi.mocked(tmdbClient.get).mockResolvedValue(createTMDBResponse());
      vi.mocked(redis.get).mockResolvedValue(null);
      const result = await moviesService.searchMovies({ query: 'inception' });
      expect(result).toEqual(createTMDBResponse());
      expect(vi.mocked(tmdbClient.get)).toHaveBeenCalled();
      expect(vi.mocked(redis.pipeline().set)).toHaveBeenCalled();
    });

    it('Movies missing from cache should be retrieved from the TMDB client', async () => {
      const missingMovieData = { id: 2, title: 'Movie 2' };

      vi.mocked(redis.get).mockResolvedValueOnce(
        JSON.stringify(createSearchIndex({ ids: [1, 2], total_results: 2 })),
      );
      vi.mocked(redis.pipeline().exec).mockResolvedValueOnce([
        [null, JSON.stringify(createMovie())],
        [null, null],
      ]);
      vi.mocked(tmdbClient.get).mockResolvedValue(
        createMovieDetail(missingMovieData),
      );

      const result = await moviesService.searchMovies({ query: 'inception' });
      expect(result).toEqual(
        createTMDBResponse({
          results: [createMovie(), createMovie(missingMovieData)],
          total_results: 2,
        }),
      );
    });

    it('Should filter by year when the yearFrom/yearTo parameters are provided', async () => {
      const movie1 = createMovie({ release_date: '2019-01-01' });
      const movie2 = createMovie({
        id: 2,
        title: 'Movie 2',
        release_date: '2022-01-01',
      });
      const movie3 = createMovie({
        id: 3,
        title: 'Movie 3',
        release_date: '2025-01-01',
      });

      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(tmdbClient.get).mockResolvedValue(
        createTMDBResponse({
          results: [movie1, movie2, movie3],
          total_results: 3,
        }),
      );

      //llamar a movies service con años en los parametros
      const result = await moviesService.searchMovies({
        query: 'movie',
        yearFrom: '2019',
        yearTo: '2022',
      });

      //la respuesta de movies service solo deberia contener peliculas dentro de ese rango de años
      expect(result.results).toEqual([movie1, movie2]);
      expect(redis.pipeline().set).toHaveBeenCalled(); //se deberia guardar la busqueda en cache
    });

    it('Should filter by genre when the genre parameter is provided', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(tmdbClient.get).mockResolvedValue(
        createTMDBResponse({
          results: [
            createMovie({ genre_ids: [1] }),
            createMovie({ id: 2, title: 'Movie 2', genre_ids: [2] }),
          ],

          total_results: 1,
        }),
      );
      const result = await moviesService.searchMovies({
        query: 'movie',
        genre: 1,
      });

      expect(result.results).toEqual([createMovie({ genre_ids: [1] })]);
    });
  });

  describe('getMovieById', () => {
    it('Should return a cached movie when it exists in Redis', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(createMovie()));
      const result = await moviesService.getMovieById(1);
      expect(result).toEqual(createMovie());
      expect(tmdbClient.get).not.toHaveBeenCalled();
    });

    it('Should fetch the movie from the TMDB client when it does not exist in cache', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(tmdbClient.get).mockResolvedValue(createMovieDetail());
      const result = await moviesService.getMovieById(1);
      expect(result).toEqual(createMovie());
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('getGenres', () => {
    it('Should return cached genres when it exists in Redis', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([createGenre()]));
      const result = await moviesService.getGenres();
      expect(result).toEqual([createGenre()]);
      expect(tmdbClient.get).not.toHaveBeenCalled();
    });

    it('Should fetch the genres from the TMDB client when it does not exist in cache', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(tmdbClient.get).mockResolvedValue({ genres: [createGenre()] });
      const result = await moviesService.getGenres();
      expect(result).toEqual([createGenre()]);
      expect(redis.set).toHaveBeenCalled();
    });
  });
});
