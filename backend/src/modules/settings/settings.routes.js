import { Router } from "express";
import { settingsController } from "./settings.controller.js";
import { authenticateUser } from "../../middleware/authenticate.js";

const router = Router();

// GET /api/settings - Authenticated user's profile and preferences
router.get("/", authenticateUser, settingsController.getSettings);

// PATCH /api/settings - Authenticated partial preference update
router.patch("/", authenticateUser, settingsController.updateSettings);

export default router;
