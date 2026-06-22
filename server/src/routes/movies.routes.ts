import { Router } from 'express';
import { moviesService } from '../service/movies.service.js';
import { searchMoviesSchema } from '../schemas/movie.schemas.js';

const router = Router();

router.get('/search', async (req, res) => {
  const params = searchMoviesSchema.parse(req.query);
  const result = await moviesService.searchMovies(params);
  res.json(result);
});

router.get('/genres', async (req, res) => {
  const genres = await moviesService.getGenres();
  res.json(genres);
});

export default router;
