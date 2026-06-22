import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError.js';

export async function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  nex: NextFunction,
) {
  if (error instanceof AppError) {
    res
      .status(error.statusCode)
      .json({ status: 'error', message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid params',
      errors: error.issues,
    });
    return;
  }

  console.error('Unexpected error: ', error);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
}

export default errorHandler;
