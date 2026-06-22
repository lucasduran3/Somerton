import z from 'zod';

export const searchMoviesSchema = z.object({
  query: z.string().optional(),
  genre: z.coerce.number().optional(),
  yearFrom: z.string().optional(),
  yearTo: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
});