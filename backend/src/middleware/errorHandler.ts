import type { Request, Response, NextFunction } from 'express';
import type { AppError } from '../types/index.js';

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    status: 'error',
    message,
    ...(err.code && { code: err.code }),
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ status: 'error', message: 'Route not found' });
}
