import 'dotenv/config';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  lazyConnect: true,
});

redis.on('error', (err: Error) => console.error('Redis error: ' + err));

export default redis;
