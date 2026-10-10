import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "./errorHandler.js";

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication required. Please provide a Bearer token.", 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError("Authentication token is missing.", 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Access token expired. Please refresh your session.", 401);
      }
      throw new AppError("Invalid or corrupted access token.", 401);
    }

    if (!decoded.sub) {
      throw new AppError("Invalid token payload.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("The user associated with this token no longer exists.", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated. Access is denied.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
