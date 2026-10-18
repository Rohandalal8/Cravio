import type { NextFunction, Request, Response } from "express";

type AppError = Error & {
  statusCode?: number;
  code?: string;
};

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    code: "NOT_FOUND",
  });
}

export function errorHandler(
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = error.statusCode ?? 500;
  const code = error.code ?? "SERVER_ERROR";

  res.status(statusCode).json({
    success: false,
    message: statusCode < 500 || process.env.NODE_ENV !== "production" ? error.message : "Something went wrong",
    code,
  });
}
