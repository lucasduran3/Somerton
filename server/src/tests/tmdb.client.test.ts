import { tmdbClient } from '../lib/tmdb.client.js';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('tmdbClient', () => {
  it('Should return data when TMDB response is OK', async () => {
    //Arrange - prepara los datos
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [],
        page: 1,
        total_pages: 1,
        total_results: 0,
      }),
    });

    //Act - ejecuta la funcion
    const result = await tmdbClient.get('/search/movie', {
      query: 'inception',
    });

    //Assert - verifica el resultado esperado
    expect(result).toEqual({
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
    });
  });

  it('Should throw AppError with 404 status when TMDB does not find the resource', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(
      tmdbClient.get('/search/movie', { query: 'inception' }),
    ).rejects.toMatchObject({
      message: 'Movie not found on TMDB',
      statusCode: 404,
    });
  });

  it('Should throw AppError when can not connect to TMDB', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    await expect(
      tmdbClient.get('/search/movie', { query: 'inception' }),
    ).rejects.toMatchObject({
      message: 'Could not reach TMDB',
      statusCode: 503,
    });
  });
});
