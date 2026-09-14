import { Router } from 'express';
import { searchMovies, getGenres } from '../service/movies.service.js';
import { searchMoviesSchema } from '../schemas/movies.schemas.js';

const router = Router();

router.get('/search', async (req, res) => {
  const params = searchMoviesSchema.parse(req.query);
  const result = await searchMovies(params);
  res.json(result);
});

router.get('/genres', async (req, res) => {
  const genres = await getGenres();
  res.json(genres);
});

export default router;
