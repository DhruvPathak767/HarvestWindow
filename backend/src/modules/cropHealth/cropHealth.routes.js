/**
 * HarvestWindow Phase AI-6: Crop Health REST API Routes
 */
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { uploadImageMiddleware } from "./cropHealth.service.js";
import {
  analyzeCropHealth,
  getAnalysisById,
  getUserHistory,
  deleteAnalysis,
  getModelStatus,
} from "./cropHealth.controller.js";

export const cropHealthRoutes = Router();

// Public model status
cropHealthRoutes.get("/status", getModelStatus);

// Authenticated routes
cropHealthRoutes.use(authenticate);

cropHealthRoutes.post(
  "/analyze",
  uploadImageMiddleware.single("image"),
  analyzeCropHealth
);

cropHealthRoutes.get("/history", getUserHistory);
cropHealthRoutes.get("/analyses/:analysisId", getAnalysisById);
cropHealthRoutes.delete("/analyses/:analysisId", deleteAnalysis);

export default cropHealthRoutes;
