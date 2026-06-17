import 'dotenv/config';
import app from './app.js';
import { config } from './config/env.js';
import redis from './db/redis.js';

async function startServer() {
    
  try {
    await redis.ping();
    console.log('Redis connection successful');

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Redis connection error: ', err);
    process.exit(1);
  }
}


startServer();
