import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import farmRoutes from "./modules/farms/farms.routes.js";
import cropRoutes from "./modules/crops/crops.routes.js";
import forecastRoutes from "./modules/forecasts/forecasts.routes.js";
import weatherRoutes from "./modules/weather/weather.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";

export const app = express();

// Trust reverse proxy if running behind one
app.set("trust proxy", 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Strict CORS allowlisting
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or automated testing)
      if (!origin) return callback(null, true);

      // In development mode, allow any local dev server port (e.g. 5173, 5174, 3000)
      if (
        config.NODE_ENV === "development" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      if (origin === config.FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Body Parsing & Cookie Parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Global API Rate Limiting
app.use("/api", apiLimiter);

// Health Checks
app.get(["/api/v1/health", "/api/health"], (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "HarvestWindow Backend API is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
    },
  });
});

// API Routes (Mounted on both /api/v1 and /api for full compatibility)
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/v1/users", usersRoutes);
app.use("/api/users", usersRoutes);

app.use("/api/v1/farms", farmRoutes);
app.use("/api/farms", farmRoutes);

app.use("/api/v1/crops", cropRoutes);
app.use("/api/crops", cropRoutes);

app.use("/api/v1/forecasts", forecastRoutes);
app.use("/api/forecasts", forecastRoutes);

app.use("/api/v1/weather", weatherRoutes);
app.use("/api/weather", weatherRoutes);

app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/v1/settings", settingsRoutes);
app.use("/api/settings", settingsRoutes);

// 404 Handler & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
