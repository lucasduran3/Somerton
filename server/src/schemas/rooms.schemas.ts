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

export const roomIdSchema = z.object({
  roomId: z.string().trim().min(1),
});

export const sendMessageSchema = roomIdSchema.extend({
  text: z.string().trim().min(1).max(4096),
});

export const kickUserSchema = roomIdSchema.extend({
  userToRemove: z.string().trim().min(1),
});

export const createRoomSchema = z.object({
  movieId: z.number(),
  duration: z.number().min(900).max(7200),
  maxUsers: z.number().int().min(1).max(5),
});
