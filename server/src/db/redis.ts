import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { AppError } from '../shared/errors/AppError.js';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  console.error(err);
  throw new AppError(err.message);
});

export default redis;
