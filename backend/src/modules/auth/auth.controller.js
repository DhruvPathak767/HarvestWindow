import { config } from "../../config/env.js";
import { authService } from "./auth.service.js";

const REFRESH_COOKIE_NAME = "refreshToken";

function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: "/api/v1/auth",
    expires: expiresAt,
  };
}

function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: "/api/v1/auth",
  };
}

export class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers["user-agent"];
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const result = await authService.login({
        email,
        password,
        userAgent,
        ipAddress,
      });

      res.cookie(
        REFRESH_COOKIE_NAME,
        result.rawRefreshToken,
        getCookieOptions(result.refreshTokenExpiresAt)
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      // Prefer HttpOnly cookie, allow body fallback if configured
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const userAgent = req.headers["user-agent"];
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const result = await authService.refresh({
        rawRefreshToken,
        userAgent,
        ipAddress,
      });

      res.cookie(
        REFRESH_COOKIE_NAME,
        result.rawRefreshToken,
        getCookieOptions(result.refreshTokenExpiresAt)
      );

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      await authService.logout({ rawRefreshToken });

      res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: "Current authenticated user retrieved",
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
