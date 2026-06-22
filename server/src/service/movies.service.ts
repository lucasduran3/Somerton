import redis from '../db/redis.js';
import { tmdbClient } from '../lib/tmdb.client.js';
import { GenreResponse, TmdbResponse } from '../types/tmdb.types.js';

async function searchMovies(params: {
  query?: string;
  genre?: number;
  yearFrom?: string;
  yearTo?: string;
  page?: number;
}): Promise<TmdbResponse> {
  const currentYear = new Date().getFullYear().toString();
  const ttl = params.yearTo === currentYear ? 3600 : 86400 * 7;

  return withCache(
    `movies:search:${params.query ?? ''}:${params.genre ?? ''}:${params.yearFrom ?? ''}:${params.yearTo ?? ''}:${params.page ?? 1}`,
    ttl,
    async () => {
      if (params.query) {
        const data = await tmdbClient.get<TmdbResponse>('/search/movie', {
          query: params.query,
          page: params.page ?? 1,
        });

        if (params.yearFrom || params.yearTo) {
          const from = parseInt(params.yearFrom ?? '0');
          const to = parseInt(params.yearTo ?? '9999');

          data.results = data.results.filter((movie) => {
            const movieYear = parseInt(movie.release_date.split('-')[0]);
            return movieYear >= from && movieYear <= to;
          });
        }

        if (params.genre) {
          data.results = data.results.filter((movie) =>
            movie.genre_ids.includes(params.genre!),
          );
        }
        return data;
      } else {
        return tmdbClient.get<TmdbResponse>('/discover/movie', {
          ...(params.genre && { with_genres: params.genre }),
          ...(params.yearFrom && {
            'primary_release_date.gte': `${params.yearFrom}-01-01`,
          }),
          ...(params.yearTo && {
            'primary_release_date.lte': `${params.yearTo}-12-31`,
          }),
          page: params.page ?? 1,
        });
      }
    },
  );
}

async function getGenres(): Promise<GenreResponse> {
  return withCache('movies:genres', 86400, () =>
    tmdbClient.get<GenreResponse>('/genre/movie/list'),
  );
}

async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', ttl);
  return data;
}

export const moviesService = { getGenres, searchMovies };
