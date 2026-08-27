import redis from '../db/redis.js';
import { tmdbClient } from '../lib/tmdb.client.js';
import { AppError } from '../shared/errors/AppError.js';
import {
  Genre,
  GenreResponse,
  Movie,
  MovieDetail,
  SearchIndex,
  SearchMoviesParams,
  TmdbResponse,
} from '../types/tmdb.types.js';

//---- funciones publicas ----
async function searchMovies(params: SearchMoviesParams): Promise<TmdbResponse> {
  const cacheKey = `movies:search:${params.query ?? ''}:${params.genre ?? ''}:${params.yearFrom ?? ''}:${params.yearTo ?? ''}:${params.page ?? 1}`;
  const cached = await getSearchIndexFromCache(cacheKey);

  if (cached) {
    const cachedMovies = await substractMoviesFromSearchIndex(cached);

    //Buscar peliculas individuales que no estan en cache y obtenerlas de tmdb
    const missingIds = cached.ids.filter((_, i) => cachedMovies[i] === null);
    const fetchedMovies = await Promise.all(
      missingIds.map((id) => getMovieFromTMDB(id)),
    );

    let fetchedIndex = 0;
    const results = cachedMovies
      .map((movie) => {
        if (movie === null) return fetchedMovies[fetchedIndex++];
        return movie;
      })
      .filter((movie): movie is Movie => movie != undefined);

    return {
      page: cached.page,
      results: results,
      total_pages: cached.total_pages,
      total_results: cached.total_results,
    };
  }
  let data;
  //Si no esta en cache, consultamos a tmdb directo
  if (params.query) {
    data = await tmdbClient.get<TmdbResponse>('/search/movie', {
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
  } else {
    data = await tmdbClient.get<TmdbResponse>('/discover/movie', {
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
  const currentYear = new Date().getFullYear();
  const ttl = params.yearTo === currentYear.toString() ? 3600 : 86400 * 7;

  const pipeline = redis.pipeline();
  data.results.forEach((movie) => {
    pipeline.set(`movies:id:${movie.id}`, JSON.stringify(movie), 'EX', ttl);
  });

  const index: SearchIndex = {
    ids: data.results.map((m) => m.id),
    page: data.page,
    total_pages: data.total_pages,
    total_results: data.total_results,
  };
  pipeline.set(cacheKey, JSON.stringify(index), 'EX', ttl);

  try {
    await pipeline.exec();
  } catch (error) {
    console.error('Error al guardar en cache:', error);
  }

  return data;
}

async function getMovieById(movieId: number): Promise<Movie> {
  const cached = await redis.get(`movies:id:${movieId}`);
  if (cached) return JSON.parse(cached);

  //tmdb.client lanza 404 si no lo encuentra
  return await getMovieFromTMDB(movieId);
}

async function getGenres(): Promise<Genre[]> {
  const cached = await redis.get('movies:genres');
  if (cached) return JSON.parse(cached);

  const genresResponse =
    await tmdbClient.get<GenreResponse>('/genre/movie/list');
  await redis.set(
    'movies:genres',
    JSON.stringify(genresResponse.genres),
    'EX',
    86400,
  );
  return genresResponse.genres;
}

async function getGenreById(genreId: number): Promise<Genre> {
  const genres = await getGenres();
  const genre = genres.find((g) => g.id === genreId);
  if (!genre) throw new AppError('Género no encontrado', 404);
  return genre;
}

//---- funciones privadas (helpers) ----

async function getSearchIndexFromCache(
  key: string,
): Promise<SearchIndex | null> {
  const cached = await redis.get(key);
  return cached ? (JSON.parse(cached) as SearchIndex) : null;
}

async function substractMoviesFromSearchIndex(
  searchIndex: SearchIndex,
): Promise<Array<Movie | null>> {
  const pipeline = redis.pipeline();
  searchIndex.ids.forEach((id) => {
    pipeline.get(`movies:id:${id}`);
  });

  try {
    let rawCachedMovies = await pipeline.exec();
    if (!rawCachedMovies) return [];

    const cachedMovies: Array<Movie | null> = rawCachedMovies.map(
      ([error, result]) => {
        if (error || !result) return null;
        return JSON.parse(result as string) as Movie;
      },
    );

    return cachedMovies;
  } catch (error) {
    console.error('Error al obtener películas de la búsqueda en cache:', error);
    throw new AppError('Ocurrió un error al intentar buscar películas', 500);
  }
}

async function getMovieFromTMDB(movieId: number): Promise<Movie> {
  const detail = await tmdbClient.get<MovieDetail>(`/movie/${movieId}`);
  const movie = {
    id: detail.id,
    title: detail.title,
    overview: detail.overview,
    poster_path: detail.poster_path,
    release_date: detail.release_date,
    genre_ids: detail.genres.map((g) => g.id),
  };
  await saveMovieInCache(movie);
  return movie;
}

async function saveMovieInCache(movie: Movie) {
  const ttl =
    new Date(movie.release_date).getFullYear() === new Date().getFullYear()
      ? 86400
      : 86400 * 7;

  await redis.set(`movies:id:${movie.id}`, JSON.stringify(movie), 'EX', ttl);
}

export const moviesService = {
  getGenres,
  searchMovies,
  getMovieById,
  getGenreById,
};
