/**
 * HarvestWindow — domain types.
 * All demo data and UI state flows through these contracts so a real
 * backend can be swapped in without touching presentation code.
 */

export type AreaUnit = "hectare" | "acre";

/** Readiness states are always paired with a text label — never colour alone. */
export type ReadinessStatus =
  | "growing"
  | "approaching"
  | "in-window"
  | "caution"
  | "passed";

export type ForecastSourceType =
  | "rule-based-demo"
  | "agronomic-reference"
  | "user-input";

export type Priority = "high" | "medium" | "low";

export type RecommendationStatus = "open" | "completed" | "dismissed";

export interface Farm {
  id: string;
  userId?: string;
  name: string;
  state: string;
  district: string;
  villageOrTaluka?: string | null;
  village?: string | null;
  postalCode?: string | null;
  pincode?: string | null;
  soilType?: string | null;
  irrigationSource?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  area: number;
  areaUnit: AreaUnit | string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Crop {
  id: string;
  farmId: string;
  name: string;
  variety?: string;
  plantingDate: string; // ISO yyyy-mm-dd
  growthStage?: string;
  fieldArea?: number;
  expectedYield?: string;
  irrigation?: "rainfed" | "irrigated" | "mixed";
  notes?: string;
  createdAt: string;
}

export type FactorDirection = "advances" | "delays" | "supports" | "neutral";
export type FactorWeight = "high" | "medium" | "low";

export interface ContributingFactor {
  label: string;
  detail: string;
  direction: FactorDirection;
  weight: FactorWeight;
}

export interface GrowthStagePoint {
  stage: string;
  startDate: string;
  endDate: string;
  /** true = derived from the recorded planting date (past), false = estimate */
  observed: boolean;
  shareOfSeason: number;
}

export interface Forecast {
  id: string;
  cropId: string;
  estimatedWindowStart: string;
  estimatedWindowEnd: string;
  readinessStatus: ReadinessStatus;
  /** Optional by contract: completeness of inputs, not measured model accuracy. */
  confidence?: number;
  contributingFactors: ContributingFactor[];
  stagePlan: GrowthStagePoint[];
  seasonProgress: number;
  daysToWindowStart: number;
  daysToWindowEnd: number;
  weatherNote?: string;
  nextAction: string;
  updatedAt: string;
  sourceType: ForecastSourceType;
  modelNote: string;
}

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "overcast"
  | "rain"
  | "storm";

export interface WeatherDay {
  date: string;
  minTempC: number;
  maxTempC: number;
  rainfallMm: number;
  humidity: number;
  condition: WeatherCondition;
}

export interface WeatherCaution {
  id: string;
  level: "advisory" | "watch" | "caution";
  title: string;
  detail: string;
  dates: string;
}

export interface WeatherSummary {
  farmId: string;
  locationLabel: string;
  observedAt: string;
  temperatureC: number;
  feelsLikeC: number;
  rainfallMm: number;
  humidity: number;
  windKph: number;
  condition: WeatherCondition;
  forecastSummary: string;
  daily: WeatherDay[];
  cautions: WeatherCaution[];
  sourceType: "demo-dataset" | "live-provider";
  sourceLabel: string;
}

export interface Recommendation {
  id: string;
  cropId: string;
  farmId: string;
  title: string;
  reason: string;
  priority: Priority;
  suggestedAction: string;
  status: RecommendationStatus;
  createdAt: string;
  relevantDate?: string;
  category: "weather" | "timing" | "logistics" | "monitoring";
}

export type ActivityType =
  | "crop-added"
  | "farm-added"
  | "farm-updated"
  | "forecast-refreshed"
  | "window-changed"
  | "recommendation-generated"
  | "recommendation-completed";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  at: string; // ISO timestamp
  farmId?: string;
  cropId?: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  role: string;
  organisation: string;
}

export interface NotificationPrefs {
  harvestWindowAlerts: boolean;
  weatherCautions: boolean;
  weeklySummary: boolean;
}

export interface AppSettings {
  areaUnit: AreaUnit;
  defaultFarmId: string | null;
  language: "en" | "hi" | "kn" | "ta";
  notifications: NotificationPrefs;
  temperatureUnit: "c" | "f";
  compactDensity: boolean;
}

export interface CropCatalogEntry {
  name: string;
  family: "cereal" | "pulse" | "oilseed" | "vegetable" | "fibre" | "plantation";
  stageTemplateName: keyof typeof STAGE_TEMPLATES;
  /** Typical sowing → harvest-window-open duration, in days. */
  durationRange: [number, number];
  seasons: string[];
  searchTerms: string[];
  note: string;
  image?: string;
}

export const STAGE_TEMPLATES = {
  cerealGrain: [
    "Sowing & establishment",
    "Vegetative growth",
    "Panicle / head initiation",
    "Flowering",
    "Grain filling",
    "Approaching maturity",
  ],
  wheat: [
    "Sowing & germination",
    "Tillering",
    "Stem extension",
    "Heading & flowering",
    "Grain filling",
    "Maturity (dough → hard)",
  ],
  fruitingVegetable: [
    "Transplant / establishment",
    "Vegetative growth",
    "Flowering",
    "Fruit set",
    "Fruit development",
    "Ripening",
  ],
  fibre: [
    "Sowing & emergence",
    "Vegetative growth",
    "Squaring",
    "Flowering & boll set",
    "Boll development",
    "Boll burst",
  ],
  pod: [
    "Sowing & emergence",
    "Vegetative growth",
    "Flowering",
    "Pegging",
    "Pod development",
    "Pod fill & maturity",
  ],
  cane: [
    "Sett planting",
    "Germination & tillering",
    "Grand growth",
    "Cane elongation",
    "Sugar accumulation",
    "Maturity",
  ],
} as const;

export const READINESS_META: Record<
  ReadinessStatus,
  { label: string; short: string; description: string; tone: string }
> = {
  growing: {
    label: "Growing",
    short: "Growing",
    description:
      "The crop is still developing. The estimated harvest window is further out.",
    tone: "living",
  },
  approaching: {
    label: "Approaching readiness",
    short: "Approaching",
    description:
      "The estimated harvest window opens soon. Start planning labour and logistics.",
    tone: "gold",
  },
  "in-window": {
    label: "Within estimated harvest window",
    short: "In window",
    description:
      "Today falls inside the estimated harvest range for this crop.",
    tone: "forest",
  },
  caution: {
    label: "Weather caution",
    short: "Caution",
    description:
      "Upcoming conditions may affect harvesting inside or near the estimated window.",
    tone: "caution",
  },
  passed: {
    label: "Harvest window passed",
    short: "Passed",
    description:
      "The estimated window has closed. Review the crop before scheduling further work.",
    tone: "earth",
  },
};
