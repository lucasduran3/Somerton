export interface Genre {
  id: number;
  name: string;
}

export interface GenreResponse {
  genres: Genre[];
}

export interface TmdbResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface MovieSearchResponse extends Omit<TmdbResponse, 'results'> {
  results: MovieSearchResult[];
}

export interface SearchIndex {
  ids: number[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface SearchMoviesParams {
  query?: string;
  year?: number;
  page?: number;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  genre_ids: number[];
  release_date: string;
}

export interface MovieSearchResult extends Movie {
  isInUse: boolean;
}

export interface MovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  genres: Genre[];
  release_date: string;
}
