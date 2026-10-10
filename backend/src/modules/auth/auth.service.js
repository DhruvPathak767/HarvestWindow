import crypto from "crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

// Safe user projection (never returns passwordHash)
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
};

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

function calculateExpiryDate(expiresInString) {
  // Parse simple expressions like '7d', '15m', '24h'
  const match = expiresInString.match(/^(\d+)([smhd])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days fallback
  }
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  let multiplier = 1000;
  if (unit === "m") multiplier = 60 * 1000;
  if (unit === "h") multiplier = 60 * 60 * 1000;
  if (unit === "d") multiplier = 24 * 60 * 60 * 1000;

  return new Date(Date.now() + amount * multiplier);
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      jti: crypto.randomUUID(),
    },
    config.JWT_ACCESS_SECRET,
    {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }
  );
}

export class AuthService {
  /**
   * Registers a new user with Argon2id password hashing.
   */
  async register({ name, email, password, role = "FARMER" }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError("An account with this email address already exists.", 409, [
        { field: "email", message: "This email address is already registered." },
      ]);
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

    // Enforce role assignment security: default to FARMER, never allow ADMIN
    const safeRole = role && ["FARMER", "SELLER", "BUYER", "EXPERT"].includes(role) ? role : "FARMER";

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: safeRole,
      },
      select: SAFE_USER_SELECT,
    });

    return user;
  }

  /**
   * Authenticates user credentials, sets up a refresh session, and issues an access token.
   */
  async login({ email, password, userAgent, ipAddress }) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error message to prevent account enumeration
    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new AppError("Invalid email or password.", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated. Please contact support.", 403);
    }

    // Generate session & tokens
    const rawRefreshToken = generateRawRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = calculateExpiryDate(config.JWT_REFRESH_EXPIRES_IN);

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
        ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
      },
    });

    const accessToken = signAccessToken(user);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: safeUser,
      accessToken,
      rawRefreshToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  /**
   * Rotates a refresh token session and issues a fresh short-lived access token.
   */
  async refresh({ rawRefreshToken, userAgent, ipAddress }) {
    if (!rawRefreshToken) {
      throw new AppError("Refresh token is required.", 401);
    }

    const tokenHash = hashToken(rawRefreshToken);

    const session = await prisma.refreshSession.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new AppError("Invalid or expired session. Please sign in again.", 401);
    }

    // Detect refresh token reuse (breach detection)
    if (session.revokedAt !== null) {
      // Invalidate all active sessions for this user as a safeguard
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError(
        "Invalid session: token reuse detected. All sessions revoked. Please log in again.",
        401
      );
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new AppError("Session expired. Please sign in again.", 401);
    }

    // Check user active status
    if (!session.user || !session.user.isActive) {
      throw new AppError("User account is inactive or not found.", 403);
    }

    // Token rotation within transaction
    const newRawRefreshToken = generateRawRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = calculateExpiryDate(config.JWT_REFRESH_EXPIRES_IN);

    await prisma.$transaction([
      prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
          userAgent: userAgent ? userAgent.slice(0, 500) : null,
          ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
        },
      }),
    ]);

    const accessToken = signAccessToken(session.user);

    const safeUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      isActive: session.user.isActive,
      emailVerifiedAt: session.user.emailVerifiedAt,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    };

    return {
      user: safeUser,
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      refreshTokenExpiresAt: newExpiresAt,
    };
  }

  /**
   * Revokes the refresh session.
   */
  async logout({ rawRefreshToken }) {
    if (!rawRefreshToken) {
      return { success: true };
    }

    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Fetches safe authenticated user profile by ID.
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated.", 403);
    }

    return user;
  }
}

export const authService = new AuthService();
