/**
 * Centralized application error handling middleware.
 * Ensures consistent and safe error responses across all API endpoints,
 * hiding internal database details and stack traces from clients.
 */
export function errorHandler(err, req, res, next) {
  // If response headers are already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle JSON syntax parsing errors in request body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload in request body",
    });
  }

  // Handle Prisma Known Request Errors safely
  if (err?.code && typeof err.code === "string" && err.code.startsWith("P")) {
    switch (err.code) {
      case "P2002": {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(", ")
          : "field";
        return res.status(409).json({
          success: false,
          message: `A record with this ${target} already exists.`,
        });
      }
      case "P2025":
        return res.status(404).json({
          success: false,
          message: "The requested record was not found.",
        });
      case "P2003":
        return res.status(400).json({
          success: false,
          message: "Database relation constraint violation.",
        });
      default:
        console.error(`[Prisma Database Error ${err.code}]:`, err.message);
        return res.status(500).json({
          success: false,
          message: "A database error occurred while processing your request.",
        });
    }
  }

  // Custom status code or default 500
  const statusCode = Number.isInteger(err.statusCode)
    ? err.statusCode
    : Number.isInteger(err.status)
      ? err.status
      : 500;

  const response = {
    success: false,
    message: statusCode >= 500 ? "Internal server error" : (err.message || "An unexpected error occurred"),
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (statusCode >= 500) {
    console.error(`[Server Error ${req.method} ${req.originalUrl}]:`, err);
  }

  return res.status(statusCode).json(response);
}

/**
 * 404 Route Not Found middleware.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
}
