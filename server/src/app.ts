import express from 'express';
import cors from 'cors';
import { AppError } from './shared/errors/AppError.js';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';

const app = express();
app.use(express.json({ limit: '10kb' }));

app.use(
  cors({
    origin: config.clientUrl,
  }),
);

app.use('/health', healthRouter);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof AppError) {
      return res
        .status(err.statusCode)
        .json({ status: 'error', message: err.message });
    }
    console.error('Unexpected error: ', err);
    res
      .status(500)
      .json({ status: 'error', message: 'Internal Server Errror' });
  },
);

export default app;
