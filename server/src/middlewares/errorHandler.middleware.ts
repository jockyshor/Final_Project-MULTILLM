import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled Server Error:', err);

  if (!res.headersSent) {
    res.status(500).json({
      error: err.message || 'Internal Server Error',
    });
  }
}