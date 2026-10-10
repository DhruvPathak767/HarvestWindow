import { AppError } from "./errorHandler.js";

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("User identity is not verified.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
    }

    next();
  };
}

export function requireOwnershipOrRole(getOwnerIdFromReq, ...bypassRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("User identity is not verified.", 401));
    }

    if (bypassRoles.includes(req.user.role)) {
      return next();
    }

    const ownerId = getOwnerIdFromReq(req);
    if (!ownerId || req.user.id !== ownerId) {
      // 403 Forbidden or 404 to avoid exposing existence of other users' resources
      return next(new AppError("Access denied: You do not own this resource.", 403));
    }

    next();
  };
}
