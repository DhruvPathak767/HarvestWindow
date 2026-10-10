import { Router } from "express";
import { dashboardController } from "./dashboard.controller.js";
import { authenticateUser } from "../../middleware/authenticate.js";

const router = Router();

// GET /api/dashboard - Authenticated user-scoped dashboard analytics
router.get("/", authenticateUser, dashboardController.getDashboard);

export default router;
