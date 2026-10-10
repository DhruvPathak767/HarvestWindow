import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  handleCreateHarvestPrediction,
  handleGetPredictionHistory,
} from "./harvestPrediction.controller.js";

const router = Router();

// Authentication required for all harvest prediction endpoints
router.use(authenticate);

// POST /api/harvest-predictions
router.post("/", handleCreateHarvestPrediction);

// GET /api/harvest-predictions/history/:cropId
router.get("/history/:cropId", handleGetPredictionHistory);

export default router;
