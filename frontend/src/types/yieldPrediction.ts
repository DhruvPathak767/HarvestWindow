/**
 * Yield Forecasting & Production Estimation Types (Phase AI-5).
 */

export type PredictionStage =
  | "BEFORE_SOWING"
  | "VEGETATIVE"
  | "MID_SEASON"
  | "NEAR_HARVEST"
  | "POST_HARVEST";

export type ConfidenceLevel = "HIGH" | "MODERATE" | "LOW";

export interface PlantedAreaInfo {
  value: number;
  unit: string;
  areaHectares: number;
}

export interface YieldValueInfo {
  value: number;
  unit: string; // "TONNE_PER_HECTARE"
}

export interface ProductionValueInfo {
  value: number;
  unit: string; // "TONNE"
}

export interface UncertaintyInfo {
  available: boolean;
  method?: string;
  lowerYieldTonnesPerHectare?: number | null;
  upperYieldTonnesPerHectare?: number | null;
  lowerProductionTonnes?: number | null;
  upperProductionTonnes?: number | null;
}

export interface ModelInfo {
  name: string;
  version: string;
  algorithm: string;
}

export interface DataQualityInfo {
  missingFeatures: string[];
  warnings: string[];
  usedFallback?: boolean;
}

export interface YieldPrediction {
  id?: string;
  cropId: string;
  cropName: string;
  variety?: string | null;
  farmId: string;
  farmName: string;
  predictionStage: PredictionStage;
  plantedArea: PlantedAreaInfo;
  yield: YieldValueInfo;
  production: ProductionValueInfo;
  uncertainty: UncertaintyInfo;
  confidence: ConfidenceLevel;
  model: ModelInfo;
  dataQuality: DataQualityInfo;
  evaluatedAt: string;
}

export interface ProductionEstimateResult {
  cropId: string;
  plantedAreaHectares: number;
  originalAreaValue: number;
  originalAreaUnit: string;
  predictedYieldTonnesPerHectare: number;
  expectedProductionTonnes: number;
  lowerProductionTonnes?: number | null;
  upperProductionTonnes?: number | null;
}

export interface ActualHarvestProduction {
  id: string;
  cropId: string;
  cropName: string;
  actualProductionTonnes: number;
  actualYieldTonnesPerHectare?: number | null;
  originalQuantity: number;
  originalUnit: string;
  harvestDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface FarmProductionSummary {
  farmId: string;
  farmName: string;
  totalCropsCount: number;
  cropsCoveredCount: number;
  coveragePct: number;
  totalPlantedAreaHectares: number;
  totalEstimatedProductionTonnes: number;
  highestYieldCrop?: {
    cropName: string;
    predictedYieldTonnesPerHectare: number;
  } | null;
  lowestYieldCrop?: {
    cropName: string;
    predictedYieldTonnesPerHectare: number;
  } | null;
  crops: YieldPrediction[];
  unitNote: string;
}
