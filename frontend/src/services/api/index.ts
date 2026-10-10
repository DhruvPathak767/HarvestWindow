import type {
  ActivityEvent,
  AppSettings,
  Crop,
  Farm,
  Forecast,
  RecommendationStatus,
  WeatherSummary,
} from "@/types";
import {
  buildSeedSnapshot,
  localStore,
  type PersistedSnapshot,
} from "@/services/storage/localStore";
import { weatherService } from "@/services/weather/weatherService";
import { computeForecasts } from "@/services/forecast/forecastService";

/**
 * Runtime configuration is kept out of UI components.
 * Set `baseUrl` (and build-time env wiring) to point at a real service and
 * implement the same `HarvestWindowApi` contract; until then everything
 * resolves from local demo data.
 */
export const API_CONFIG = {
  baseUrl: "" as string,
  mode: "demo" as "demo" | "live",
  latencyMs: 480,
};

export interface ForecastBundle {
  weather: Record<string, WeatherSummary>;
  forecasts: Record<string, Forecast>;
}

const wait = (ms = API_CONFIG.latencyMs) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface NewFarmInput {
  name: string;
  state: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
  area: number;
  areaUnit: Farm["areaUnit"];
  notes?: string;
}

export interface NewCropInput {
  name: string;
  variety?: string;
  farmId: string;
  plantingDate: string;
  growthStage?: string;
  fieldArea?: number;
  expectedYield?: string;
  irrigation?: Crop["irrigation"];
  notes?: string;
}

let idCounter = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** Contract shared by the demo implementation and any future HTTP client. */
export interface HarvestWindowApi {
  loadSnapshot(): Promise<PersistedSnapshot>;
  createFarm(input: NewFarmInput): Promise<{ farm: Farm; activity: ActivityEvent }>;
  createCrop(input: NewCropInput): Promise<{ crop: Crop; activity: ActivityEvent }>;
  setRecommendationStatus(
    id: string,
    status: RecommendationStatus
  ): Promise<{ id: string; status: RecommendationStatus }>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  resetDemoData(): Promise<PersistedSnapshot>;
}

export const api: HarvestWindowApi = {
  async loadSnapshot() {
    await wait(420);
    return localStore.load() ?? buildSeedSnapshot();
  },

  async createFarm(input) {
    await wait();
    const farm: Farm = {
      id: nextId("farm"),
      name: input.name.trim(),
      state: input.state,
      district: input.district.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      area: input.area,
      areaUnit: input.areaUnit,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    return {
      farm,
      activity: {
        id: nextId("act"),
        type: "farm-added",
        message: `${farm.name} added (${farm.district}, ${farm.state})`,
        at: new Date().toISOString(),
        farmId: farm.id,
      },
    };
  },

  async createCrop(input) {
    await wait();
    const crop: Crop = {
      id: nextId("crop"),
      farmId: input.farmId,
      name: input.name,
      variety: input.variety?.trim() || undefined,
      plantingDate: input.plantingDate,
      growthStage: input.growthStage?.trim() || undefined,
      fieldArea: input.fieldArea && input.fieldArea > 0 ? input.fieldArea : undefined,
      expectedYield: input.expectedYield?.trim() || undefined,
      irrigation: input.irrigation,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    return {
      crop,
      activity: {
        id: nextId("act"),
        type: "crop-added",
        message: `${crop.name}${crop.variety ? ` · ${crop.variety}` : ""} added to the plan`,
        at: new Date().toISOString(),
        farmId: crop.farmId,
        cropId: crop.id,
      },
    };
  },

  async setRecommendationStatus(id, status) {
    await wait(220);
    return { id, status };
  },

  async saveSettings(settings) {
    await wait(260);
    return settings;
  },

  async resetDemoData() {
    await wait(320);
    localStore.clear();
    return buildSeedSnapshot();
  },
};

/** Convenience: weather + forecasts for a set of farms/crops in one call. */
export function buildIntelligence(farms: Farm[], crops: Crop[]): ForecastBundle {
  const weather: Record<string, ReturnType<typeof weatherService.snapshotForFarm>> = {};
  for (const farm of farms) weather[farm.id] = weatherService.snapshotForFarm(farm);
  return {
    weather,
    forecasts: computeForecasts(crops, weather),
  };
}

export const newActivityId = () => nextId("act");
