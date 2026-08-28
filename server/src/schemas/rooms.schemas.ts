import z from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1),
  pageSize: z.coerce.number().int().min(1).max(50),
});

export const searchRoomsSchema = paginationSchema.extend({
  movieTitle: z.string().trim().min(1).max(500).optional(),
  isAvailable: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});
