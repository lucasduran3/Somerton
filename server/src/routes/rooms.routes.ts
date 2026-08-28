import { Router } from 'express';
import { roomsService } from '../service/rooms.service.js';
import { searchRoomsSchema } from '../schemas/rooms.schemas.js';

const router = Router();

router.get('/', async (req, res) => {
  const filters = searchRoomsSchema.parse(req.query);
  const result = await roomsService.searchRooms(filters);
  res.json(result);
});

export default router;
