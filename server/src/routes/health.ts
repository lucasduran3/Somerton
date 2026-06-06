import express from 'express';
import redis from '../db/redis.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await redis.ping();
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Database connection error: ', err);
    res
      .status(500)
      .json({ status: 'error', message: 'Redis connection failed' });
  }
});

export default router;
