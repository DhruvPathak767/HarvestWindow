import { Router } from "express";
import { dashboardController } from "./dashboard.controller.js";
import { authenticateUser } from "../../middleware/authenticate.js";
import { handleGetDashboardWeatherRisk } from "../weather/weatherRisk.controller.js";

const router = Router();

// GET /api/dashboard - Authenticated user-scoped dashboard analytics
router.get("/", authenticateUser, dashboardController.getDashboard);

// Phase AI-3: GET /api/dashboard/weather-risk
router.get("/weather-risk", authenticateUser, handleGetDashboardWeatherRisk);

export default router;

