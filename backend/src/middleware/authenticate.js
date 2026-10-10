import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "harvestwindow-jwt-super-secret-key-2026";

/**
 * Authentication middleware for Phase 1 / Phase 2.
 * Validates Bearer token from the Authorization header and attaches the verified
 * user identity to `req.user`.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid Bearer token.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded.userId || decoded.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload: missing user identity.",
      });
    }

    req.user = {
      id: String(userId),
      email: decoded.email || null,
      role: decoded.role || "Farm manager",
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired. Please sign in again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid or malformed authentication token.",
    });
  }
}

/**
 * Helper to generate a signed JWT for a user record.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "Farm manager",
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}
