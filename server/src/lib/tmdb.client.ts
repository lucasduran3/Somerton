import { config } from '../config/env.js';
import { AppError } from '../shared/errors/AppError.js';

async function get<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = buildUrl(endpoint, params);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.tmdb.accessToken}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    throw new AppError('Could not reach TMDB', 503);
  }

  if (response.status === 404) {
    throw new AppError('Movie not found on TMDB', 404);
  }

  if (response.status === 401) {
    throw new AppError('Invalid TMDB API Key', 500);
  }

  if (!response.ok) {
    throw new AppError(`TMDB error: ${response.status}`, 502);
  }

  return await response.json();
}

function buildUrl(
  path: string,
  params: Record<string, string | number> = {},
): string {
  const url = new URL(`${config.tmdb.baseUrl}${path}`);
  url.searchParams.set('language', 'en-US');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value.toString());
  }

  return url.toString();
}

export const tmdbClient = { get };
