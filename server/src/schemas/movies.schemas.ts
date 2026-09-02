import z from 'zod';

export const searchMoviesSchema = z.object({
  query: z.string().optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional(),
});