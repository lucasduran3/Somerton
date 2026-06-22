import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import movieRouter from './routes/movies.routes.js';

const app = express();
app.use(express.json({ limit: '10kb' }));

app.use(
  cors({
    origin: config.clientUrl,
  }),
);

app.use('/health', healthRouter);
app.use('/api/movies', movieRouter);

// Global error handler
app.use(errorHandler);

export default app;
