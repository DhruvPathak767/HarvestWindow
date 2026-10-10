import { config } from "../config/env.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors || undefined;

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === "P2002") {
    statusCode = 409;
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "field";
    message = `A record with this ${target} already exists.`;
    errors = [{ field: target, message }];
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "The requested record was not found.";
  } else if (err.code === "P2003") {
    statusCode = 400;
    message = "Database relation constraint violation.";
  }

  // Handle JSON parse error from express.json()
  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400)) {
    statusCode = 400;
    message = "Malformed JSON payload in request body.";
  }

  // Handle JWT invalid or expired error from jsonwebtoken
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token signature.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired. Please refresh your session.";
  }

  if (config.NODE_ENV !== "test" && statusCode === 500) {
    console.error("Unhandled Server Exception:", err);
  }

  const response = {
    success: false,
    message: statusCode === 500 && config.NODE_ENV === "production" ? "An unexpected server error occurred." : message,
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
}
