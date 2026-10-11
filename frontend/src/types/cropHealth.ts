/**
 * Phase AI-6: Crop Disease & Health Detection Types
 */

export type ConditionCategory =
  | "HEALTHY"
  | "FUNGAL_DISEASE"
  | "BACTERIAL_DISEASE"
  | "VIRAL_DISEASE"
  | "PEST_DAMAGE"
  | "NUTRIENT_OR_ENVIRONMENTAL_STRESS"
  | "UNKNOWN_OR_UNSUPPORTED";

export type DiagnosisStatus =
  | "HEALTHY"
  | "DISEASED"
  | "UNFAMILIAR"
  | "INCONCLUSIVE";

export type ConfidenceLevel =
  | "HIGH_CONFIDENCE"
  | "MODERATE_CONFIDENCE"
  | "LOW_CONFIDENCE"
  | "INCONCLUSIVE";

export interface AlternativePrediction {
  class_id: string;
  display_name: string;
  crop: string;
  confidence_pct: number;
  condition_category: ConditionCategory;
  is_healthy: boolean;
}

export interface RecommendationDetails {
  condition_id: string;
  display_name: string;
  symptoms: string[];
  immediate_actions: string[];
  preventive_measures: string[];
  hygiene_practices: string[];
  when_to_contact_expert: string;
  provenance?: string;
  notes?: string;
}

export interface ImageQualityAssessment {
  is_acceptable: boolean;
  blur_score?: number;
  is_blurry: boolean;
  brightness_score?: number;
  is_poor_exposure: boolean;
  warnings: string[];
}

export interface CropHealthAnalysis {
  id: string;
  imageUrl?: string;
  imageName?: string;
  status: DiagnosisStatus;
  cropName: string;
  predictedClassId: string;
  predictedClassName: string;
  conditionCategory: ConditionCategory;
  confidencePct: number;
  confidenceLevel: ConfidenceLevel;
  confidenceInterpretation?: string;
  isHealthy: boolean;
  symptoms: string[];
  recommendations?: RecommendationDetails;
  topAlternatives: AlternativePrediction[];
  qualityWarnings: string[];
  expertGuidance?: string;
  modelVersion: string;
  analyzedAt: string;
  cropId?: string | null;
  crop?: { id: string; name: string } | null;
  farmId?: string | null;
}

export interface CropHealthHistoryResponse {
  analyses: CropHealthAnalysis[];
  total: number;
  limit: number;
  offset: number;
}

export interface CropHealthStatusResponse {
  available: boolean;
  model_name?: string;
  model_version?: string;
  architecture?: string;
  readiness_status?: string;
  supported_crops?: string[];
  total_classes?: number;
}
