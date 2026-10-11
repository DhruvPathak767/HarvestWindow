/**
 * Phase AI-9: Prediction Monitoring and Continuous Improvement API Routes
 */

import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getAccuracySummaryHandler,
  getErrorsHandler,
  getDriftHandler,
  getModelsHandler,
  getReportsHandler,
  getJobsHandler,
  triggerEvaluationHandler,
  triggerRetrainingCheckHandler,
  promoteModelHandler,
} from "./monitoring.controller.js";

const router = Router();

// Middleware to restrict privileged actions to ADMIN or EXPERT
function requireAdminOrExpert(req, res, next) {
  if (req.user && (req.user.role === "ADMIN" || req.user.role === "EXPERT")) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: Administrative or Expert privileges required.",
  });
}

// All monitoring routes require authentication
router.use(authenticate);

// ==========================================
// Prediction Performance & Drift Endpoints
// ==========================================
// Endpoint C: Accuracy summary
router.get("/accuracy", getAccuracySummaryHandler);

// Endpoint D: Crop and regional error analysis
router.get("/errors", getErrorsHandler);

// Endpoint E: Drift status and telemetry
router.get("/drift", getDriftHandler);

// Endpoint F: Model registry and active version
router.get("/models", getModelsHandler);

// Endpoint G: Historical evaluation reports
router.get("/reports", getReportsHandler);

// ==========================================
// Administrative Control Endpoints
// ==========================================
// Endpoint H: Job status history
router.get("/jobs", requireAdminOrExpert, getJobsHandler);

// Endpoint I: Administrative execution
router.post("/evaluate", requireAdminOrExpert, triggerEvaluationHandler);
router.post("/drift-check", requireAdminOrExpert, triggerEvaluationHandler);
router.post("/retrain-check", requireAdminOrExpert, triggerRetrainingCheckHandler);

// Endpoint J: Model promotion gate
router.post("/promote", requireAdminOrExpert, promoteModelHandler);

export default router;
