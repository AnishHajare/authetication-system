import AppError from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: message,
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(statusCode).json({
    message,
    details: error.details,
  });
}
