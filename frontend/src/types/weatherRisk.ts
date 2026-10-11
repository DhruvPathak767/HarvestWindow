/**
 * Phase AI-3: Weather Intelligence and Harvest Risk Types
 */

export type HarvestSuitability = "FAVORABLE" | "CAUTION" | "UNFAVORABLE" | "INSUFFICIENT_DATA";
export type RiskUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskConfidence = "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT_DATA";
export type RiskCategory = "RAINFALL" | "HUMIDITY_DRYING" | "WIND" | "TEMPERATURE" | "OPERATIONAL";
export type RiskSeverity = "NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskItem {
  category: RiskCategory;
  score: number;
  severity: RiskSeverity;
  eventStart?: string | null;
  eventEnd?: string | null;
  observedOrForecastValues?: Record<string, any>;
  explanation: string[];
  recommendedActions: string[];
}

export interface WeatherRiskAssessment {
  cropId?: string | null;
  cropName: string;
  variety?: string | null;
  harvestWindow?: {
    start: string;
    end: string;
    mostLikely?: string;
  } | null;
  forecastCoverage?: {
    start: string;
    end: string;
  } | null;
  overallRiskScore: number;
  harvestSuitability: HarvestSuitability;
  urgency: RiskUrgency;
  confidence: RiskConfidence;
  dataQuality?: {
    complete: boolean;
    missingFields?: string[];
    windowWithinForecast?: boolean;
    windowCompletelyOutside?: boolean;
    windowPartiallyOverlaps?: boolean;
    isGenericThresholds?: boolean;
    thresholdSource?: string;
  };
  risks: RiskItem[];
  recommendations: string[];
  explanation: string[];
  generatedAt: string;
  source?: {
    provider: string;
    fetchedAt: string;
  };
  farm?: {
    id: string;
    name: string;
    district?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface FarmWeatherRiskSummary {
  farm: {
    id: string;
    name: string;
    district?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  summary: {
    totalCropsAssessed: number;
    favorableCount: number;
    cautionCount: number;
    unfavorableCount: number;
    highUrgencyCount: number;
    criticalUrgencyCount: number;
    overallFarmSuitability: HarvestSuitability;
  };
  crops: WeatherRiskAssessment[];
  weather?: {
    current: any;
    dailyForecast: any[];
    provider: string;
    fetchedAt: string;
  };
}

export interface DashboardWeatherRiskSummary {
  summary: {
    totalCropsAssessed: number;
    favorableCount: number;
    cautionCount: number;
    unfavorableCount: number;
    criticalCount: number;
    highUrgencyCount: number;
    assessedAt: string;
  };
  urgentCrops: Array<{
    cropId: string;
    cropName: string;
    farmName: string;
    urgency: RiskUrgency;
    suitability: HarvestSuitability;
    overallScore: number;
    primaryRisk: string;
    recommendedAction?: string | null;
  }>;
  upcomingAdverseEvents: Array<{
    farmName: string;
    cropName: string;
    category: RiskCategory;
    severity: RiskSeverity;
    eventStart?: string | null;
    eventEnd?: string | null;
    message: string;
  }>;
  harvestOpportunities: Array<{
    cropId: string;
    cropName: string;
    farmName: string;
    windowStart: string;
    windowEnd: string;
    score: number;
  }>;
}
