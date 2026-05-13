import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({
    error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
};
