import type {
  ActivityEvent,
  AppSettings,
  BackendNotification,
  Crop,
  Farm,
  Forecast,
  Recommendation,
  RecommendationStatus,
  WeatherSummary,
  AgriCrop,
  AgriSeason,
  AgriRegion,
  AgriCropCalendar,
  AgriGrowthProfile,
  AgriSuitabilityProfile,
  AgriDataSource,
  AgriDataQuality,
} from "@/types";
import {
  buildEmptySnapshot,
  buildSeedSnapshot,
  localStore,
  type PersistedSnapshot,
} from "@/services/storage/localStore";
import { DEMO_CREDENTIALS } from "@/data/mock/seed";
import { weatherService } from "@/services/weather/weatherService";
import { computeForecast, computeForecasts } from "@/services/forecast/forecastService";

import { authClient } from "@/services/api/authClient";

/**
 * Runtime configuration for API communication.
 * Default baseUrl points to the backend /api endpoint.
 * Mode is 'live' when a backend URL is configured, with seamless fallback to 'demo'.
 */
export const API_CONFIG = {
  baseUrl:
    (import.meta.env?.VITE_API_BASE_URL as string) ||
    (import.meta.env?.VITE_API_URL as string) ||
    "http://localhost:5000/api",
  mode: ((import.meta.env?.VITE_API_MODE as string) || "live") as "demo" | "live",
  latencyMs: 380,
};

const TOKEN_STORAGE_KEY = "harvestwindow.auth.token";

export function getAuthToken(): string | null {
  try {
    const memory = authClient.getAccessToken();
    if (memory) return memory;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Safe fetch wrapper for live backend calls with Bearer auth headers.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = API_CONFIG.baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      body?.message ||
      (Array.isArray(body?.errors)
        ? body.errors
            .map(
              (e: { field?: string; message: string }) =>
                `${e.field ? `${e.field}: ` : ""}${e.message}`
            )
            .join(", ")
        : null) ||
      `Server returned ${response.status} ${response.statusText}`;

    const error = new Error(errorMsg);
    (error as unknown as { status: number; body: unknown }).status = response.status;
    (error as unknown as { status: number; body: unknown }).body = body;
    throw error;
  }

  return body as T;
}

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
  soilType?: string | null;
  irrigationSource?: string | null;
  villageOrTaluka?: string | null;
  village?: string | null;
  postalCode?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  area: number;
  areaUnit: Farm["areaUnit"];
  notes?: string;
}

export interface UpdateFarmInput {
  name?: string;
  state?: string;
  district?: string;
  soilType?: string | null;
  irrigationSource?: string | null;
  villageOrTaluka?: string | null;
  village?: string | null;
  postalCode?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  area?: number;
  areaUnit?: Farm["areaUnit"];
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

export interface UpdateCropInput {
  name?: string;
  cropName?: string;
  variety?: string;
  farmId?: string;
  plantingDate?: string;
  sowingDate?: string;
  expectedHarvestDate?: string;
  growthStage?: string;
  fieldArea?: number;
  expectedYield?: string;
  irrigation?: Crop["irrigation"];
  irrigationMethod?: string;
  irrigationFrequency?: string;
  notes?: string;
}

let idCounter = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** Contract shared by demo implementation and live HTTP client. */
export interface DashboardData {
  overview: {
    totalFarms: number;
    totalTrackedArea: number;
    totalActiveCrops: number;
    approachingHarvest: number;
    readyForHarvest: number;
    overdueHarvests: number;
  };
  cropStatusDistribution: { stage: string; count: number; label?: string }[];
  readinessDistribution: { status: string; label: string; count: number }[];
  upcomingHarvests: Array<{
    cropId: string;
    cropName: string;
    variety: string | null;
    cropVariety?: string | null;
    farmId: string;
    farmName: string;
    district: string;
    sowingDate: string | null;
    harvestWindow: { startDate: string | null; typicalDate: string | null; endDate: string | null };
    estimatedWindowStart?: string | null;
    estimatedWindowEnd?: string | null;
    baselineHarvestWindow?: { startDate: string | null; typicalDate: string | null; endDate: string | null };
    adjustedHarvestWindow?: { startDate: string | null; typicalDate: string | null; endDate: string | null } | null;
    readinessStatus: string;
    readinessLevel: string;
    confidenceScore: number;
    confidenceLevel: string;
    daysToWindowStart: number;
    daysToWindowEnd: number;
    daysUntilHarvest: number;
    daysRemaining?: number | null;
    actionableAdvice?: string | null;
    weatherAdjustmentStatus: string;
    weatherAdjustmentApplied: boolean;
    weatherAdjustmentDays?: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    at?: string;
    timestamp?: string;
    farmId?: string | null;
    cropId?: string | null;
  }>;
  forecastSummary: {
    totalForecasts: number;
    weatherAdjustedCount: number;
    baselineOnlyCount: number;
    nextUpcomingDate: string | null;
  };
}

export interface SettingsData {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  preferences: {
    areaUnit: "hectare" | "acre";
    temperatureUnit: "celsius" | "fahrenheit";
    language: "en" | "hi" | "kn" | "ta";
    defaultFarmId: string | null;
    notifications: {
      harvestWindowAlerts: boolean;
      weatherCautions: boolean;
      weeklySummary: boolean;
    };
  };
}

export interface HarvestWindowApi {
  loadSnapshot(userEmailOrId?: string | null): Promise<PersistedSnapshot>;
  listFarms(): Promise<Farm[]>;
  getFarm(id: string): Promise<Farm>;
  createFarm(input: NewFarmInput): Promise<{ farm: Farm; activity: ActivityEvent }>;
  updateFarm(
    id: string,
    input: UpdateFarmInput
  ): Promise<{ farm: Farm; activity: ActivityEvent }>;
  deleteFarm(id: string): Promise<{ id: string; activity: ActivityEvent }>;
  listCrops(params?: { farmId?: string; growthStage?: string }): Promise<Crop[]>;
  getCrop(id: string): Promise<Crop>;
  createCrop(input: NewCropInput): Promise<{ crop: Crop; activity: ActivityEvent }>;
  updateCrop(
    id: string,
    input: UpdateCropInput
  ): Promise<{ crop: Crop; activity: ActivityEvent }>;
  deleteCrop(id: string): Promise<{ id: string; activity: ActivityEvent }>;
  listForecasts(params?: {
    farmId?: string;
    cropId?: string;
    readinessStatus?: string;
  }): Promise<Forecast[]>;
  getForecast(cropId: string): Promise<Forecast>;
  refreshForecasts(scope?: {
    farmId?: string;
    cropId?: string;
  }): Promise<{
    processed: number;
    updated: number;
    failed: number;
    forecasts: Forecast[];
  }>;
  getDashboard(): Promise<DashboardData>;
  getSettings(): Promise<SettingsData>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  updateProfile(input: { fullName?: string; name?: string }): Promise<{ user: any }>;
  listRecommendations(params?: {
    status?: string;
    priority?: string;
    category?: string;
    farmId?: string;
    cropId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Recommendation[]; pagination: any }>;
  refreshRecommendations(farmId?: string): Promise<{ created: number; updated: number; retained: number; skipped: number; total: number }>;
  setRecommendationStatus(
    id: string,
    status: RecommendationStatus
  ): Promise<{ id: string; status: RecommendationStatus }>;
  listActivities(params?: {
    page?: number;
    limit?: number;
    type?: string;
    farmId?: string;
    cropId?: string;
  }): Promise<ActivityEvent[]>;
  listNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
  }): Promise<BackendNotification[]>;
  getUnreadNotificationCount(): Promise<number>;
  markNotificationRead(id: string): Promise<BackendNotification>;
  markAllNotificationsRead(): Promise<{ updatedCount: number }>;
  syncAlerts(): Promise<{ generated: number }>;
  resetDemoData(): Promise<PersistedSnapshot>;
  getFarmWeather(farmId: string, refresh?: boolean): Promise<any>;
  getCurrentLocationWeather(latitude: number, longitude: number): Promise<any>;

  // Phase AI-1: Agricultural Knowledge Base
  listAgriCrops(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    season?: string;
    state?: string;
    district?: string;
    hasGrowthProfile?: boolean;
  }): Promise<{ crops: AgriCrop[]; pagination: any }>;
  getAgriCrop(cropId: string): Promise<AgriCrop | null>;
  listAgriSeasons(): Promise<AgriSeason[]>;
  listAgriRegions(params?: { state?: string; search?: string }): Promise<AgriRegion[]>;
  getCropCalendars(params?: {
    crop?: string;
    cropId?: string;
    state?: string;
    district?: string;
    season?: string;
    year?: string;
  }): Promise<AgriCropCalendar[]>;
  getCropGrowthProfiles(params?: {
    crop?: string;
    cropId?: string;
    variety?: string;
  }): Promise<AgriGrowthProfile[]>;
  getCropSuitability(params?: {
    crop?: string;
    cropId?: string;
  }): Promise<AgriSuitabilityProfile[]>;
  getDataSources(): Promise<AgriDataSource[]>;
  getAgriDataQuality(): Promise<AgriDataQuality | null>;
}

function normalizeForecast(raw: any): Forecast {
  if (!raw) return raw;
  const conf = raw.confidence;
  const numericScore =
    typeof conf === "number"
      ? conf
      : typeof conf?.score === "number"
        ? conf.score
        : typeof raw.confidenceScore === "number"
          ? raw.confidenceScore
          : undefined;

  return {
    ...raw,
    confidence: numericScore,
    confidenceScore: numericScore,
    confidenceDetails: typeof conf === "object" && conf !== null ? conf : undefined,
  };
}

export const api: HarvestWindowApi = {
  async loadSnapshot(userEmailOrId?: string | null) {
    const isDemo = !userEmailOrId || userEmailOrId === DEMO_CREDENTIALS.email;
    const baseSnapshot =
      localStore.load(userEmailOrId) ??
      (isDemo ? buildSeedSnapshot() : buildEmptySnapshot({ email: userEmailOrId || "" }));

    if (API_CONFIG.mode === "live") {
      try {
        const liveFarms = await this.listFarms();
        let liveCrops: Crop[] | null = null;
        try {
          liveCrops = await this.listCrops();
        } catch (cropErr) {
          console.warn("[HarvestWindow API] Unable to fetch live crops during snapshot load:", cropErr);
        }

        const farmsToUse = Array.isArray(liveFarms) ? liveFarms : baseSnapshot.farms;
        const farmIdSet = new Set(farmsToUse.map((f) => f.id));
        const cropsToUse =
          liveCrops !== null
            ? liveCrops
            : isDemo
              ? baseSnapshot.crops
              : baseSnapshot.crops.filter((c) => farmIdSet.has(c.farmId));

        const validDefaultFarm = farmsToUse.some(
          (f) => f.id === baseSnapshot.settings?.defaultFarmId
        )
          ? baseSnapshot.settings.defaultFarmId
          : (farmsToUse[0]?.id ?? null);

        let liveRecs: Recommendation[] = [];
        try {
          const recRes = await this.listRecommendations({ limit: 100 });
          if (recRes && Array.isArray(recRes.items)) {
            liveRecs = recRes.items;
          }
          // If a live user has crops but 0 recommendations, trigger initial refresh
          if (!isDemo && cropsToUse.length > 0 && liveRecs.length === 0) {
            try {
              await this.refreshRecommendations();
              const refreshed = await this.listRecommendations({ limit: 100 });
              if (refreshed && Array.isArray(refreshed.items)) {
                liveRecs = refreshed.items;
              }
            } catch {
              /* ignore refresh on load error */
            }
          }
        } catch (recErr) {
          console.warn("[HarvestWindow API] Unable to fetch live recommendations during snapshot load:", recErr);
        }

        const recsToUse =
          Array.isArray(liveRecs) && liveRecs.length > 0
            ? liveRecs
            : isDemo
              ? baseSnapshot.recommendations
              : baseSnapshot.recommendations.filter((r) => farmIdSet.has(r.farmId));

        return {
          ...baseSnapshot,
          farms: farmsToUse,
          crops: cropsToUse,
          recommendations: recsToUse,
          settings: {
            ...baseSnapshot.settings,
            defaultFarmId: validDefaultFarm,
          },
        };
      } catch (err) {
        console.warn(
          "[HarvestWindow API] Unable to fetch live farms during snapshot load, using cached data:",
          err
        );
      }
    }

    if (isDemo) {
      await wait(300);
    }
    return baseSnapshot;
  },

  async listFarms() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: Farm[] }>("/farms");
        if (Array.isArray(res?.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn("[HarvestWindow API] listFarms live request failed:", err);
        throw err;
      }
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    return snap.farms;
  },

  async getFarm(id: string) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: Farm }>(`/farms/${id}`);
        return res.data;
      } catch (err) {
        console.warn(`[HarvestWindow API] getFarm live request failed for ${id}:`, err);
        throw err;
      }
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    const farm = snap.farms.find((f) => f.id === id);
    if (!farm) throw new Error("Farm not found");
    return farm;
  },

  async createFarm(input) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: Farm }>("/farms", {
          method: "POST",
          body: JSON.stringify(input),
        });
        const farm = res.data;
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
      } catch (err) {
        console.warn("[HarvestWindow API] Live farm creation failed, falling back to local store:", err);
      }
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const farm: Farm = {
      id: nextId("farm"),
      name: input.name.trim(),
      state: input.state,
      district: input.district.trim(),
      soilType: input.soilType || null,
      irrigationSource: input.irrigationSource || null,
      village: input.village || null,
      pincode: input.pincode || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      area: input.area,
      areaUnit: input.areaUnit,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    snap.farms.push(farm);
    localStore.save(snap);

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

  async updateFarm(id, input) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: Farm }>(`/farms/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        });
        const farm = res.data;
        const snap = localStore.load() ?? buildSeedSnapshot();
        snap.farms = snap.farms.map((f) => (f.id === id ? farm : f));
        localStore.save(snap);
        return {
          farm,
          activity: {
            id: nextId("act"),
            type: "farm-updated",
            message: `${farm.name} updated`,
            at: new Date().toISOString(),
            farmId: farm.id,
          },
        };
      } catch (err) {
        console.warn(`[HarvestWindow API] Live farm update failed for ${id}, using local store:`, err);
      }
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const index = snap.farms.findIndex((f) => f.id === id);
    if (index === -1) throw new Error("Farm not found");

    const existing = snap.farms[index];
    const updated: Farm = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      state: input.state !== undefined ? input.state : existing.state,
      district: input.district !== undefined ? input.district.trim() : existing.district,
      soilType: input.soilType !== undefined ? input.soilType : existing.soilType,
      irrigationSource: input.irrigationSource !== undefined ? input.irrigationSource : existing.irrigationSource,
      village: input.village !== undefined ? input.village : existing.village,
      pincode: input.pincode !== undefined ? input.pincode : existing.pincode,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      area: input.area !== undefined ? input.area : existing.area,
      areaUnit: input.areaUnit !== undefined ? input.areaUnit : existing.areaUnit,
      notes: input.notes !== undefined ? input.notes.trim() || undefined : existing.notes,
    };
    snap.farms[index] = updated;
    localStore.save(snap);

    return {
      farm: updated,
      activity: {
        id: nextId("act"),
        type: "farm-updated",
        message: `${updated.name} updated`,
        at: new Date().toISOString(),
        farmId: updated.id,
      },
    };
  },

  async deleteFarm(id) {
    if (API_CONFIG.mode === "live") {
      try {
        await apiRequest<{ success: boolean; message: string }>(`/farms/${id}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn(`[HarvestWindow API] Live deleteFarm failed for ${id}, updating local store:`, err);
      }
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    snap.farms = snap.farms.filter((f) => f.id !== id);
    snap.crops = snap.crops.filter((c) => c.farmId !== id);
    localStore.save(snap);

    return {
      id,
      activity: {
        id: nextId("act"),
        type: "farm-added",
        message: "Farm record removed from workspace",
        at: new Date().toISOString(),
        farmId: id,
      },
    };
  },

  async listCrops(params) {
    if (API_CONFIG.mode === "live") {
      try {
        let endpoint = "/crops";
        const queryParts: string[] = [];
        if (params?.farmId) queryParts.push(`farmId=${encodeURIComponent(params.farmId)}`);
        if (params?.growthStage) queryParts.push(`growthStage=${encodeURIComponent(params.growthStage)}`);
        if (queryParts.length > 0) endpoint += `?${queryParts.join("&")}`;

        const res = await apiRequest<{ success: boolean; data: Crop[] }>(endpoint);
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] listCrops live request failed, using local store:", err);
      }
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    if (params?.farmId) {
      return snap.crops.filter((c) => c.farmId === params.farmId);
    }
    return snap.crops;
  },

  async getCrop(id: string) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: Crop }>(`/crops/${id}`);
        return res.data;
      } catch (err) {
        console.warn(`[HarvestWindow API] getCrop live request failed for ${id}, using local store:`, err);
      }
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    const crop = snap.crops.find((c) => c.id === id);
    if (!crop) throw new Error("Crop not found");
    return crop;
  },

  async createCrop(input) {
    if (API_CONFIG.mode === "live") {
      const payload = {
        farmId: input.farmId,
        cropName: input.name,
        name: input.name,
        variety: input.variety?.trim() || null,
        sowingDate: input.plantingDate,
        plantingDate: input.plantingDate,
        growthStage: input.growthStage?.trim() || null,
        irrigationMethod: input.irrigation || null,
        irrigation: input.irrigation || null,
        fieldArea: input.fieldArea && input.fieldArea > 0 ? input.fieldArea : null,
        expectedYield: input.expectedYield?.trim() || null,
        notes: input.notes?.trim() || null,
      };

      const res = await apiRequest<{ success: boolean; data: Crop }>("/crops", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const crop = res.data;
      const snap = localStore.load() ?? buildSeedSnapshot();
      if (!snap.crops.some((c) => c.id === crop.id)) {
        snap.crops.push(crop);
        localStore.save(snap);
      }

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
    }

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

  async updateCrop(id, input) {
    if (API_CONFIG.mode === "live") {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.cropName = input.name;
      if (input.cropName !== undefined) payload.cropName = input.cropName;
      if (input.variety !== undefined) payload.variety = input.variety;
      if (input.farmId !== undefined) payload.farmId = input.farmId;
      if (input.plantingDate !== undefined) payload.sowingDate = input.plantingDate;
      if (input.sowingDate !== undefined) payload.sowingDate = input.sowingDate;
      if (input.expectedHarvestDate !== undefined) payload.expectedHarvestDate = input.expectedHarvestDate;
      if (input.growthStage !== undefined) payload.growthStage = input.growthStage;
      if (input.irrigation !== undefined) payload.irrigationMethod = input.irrigation;
      if (input.irrigationMethod !== undefined) payload.irrigationMethod = input.irrigationMethod;
      if (input.irrigationFrequency !== undefined) payload.irrigationFrequency = input.irrigationFrequency;
      if (input.fieldArea !== undefined) payload.fieldArea = input.fieldArea;
      if (input.expectedYield !== undefined) payload.expectedYield = input.expectedYield;
      if (input.notes !== undefined) payload.notes = input.notes;

      const res = await apiRequest<{ success: boolean; data: Crop }>(`/crops/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const crop = res.data;
      const snap = localStore.load() ?? buildSeedSnapshot();
      snap.crops = snap.crops.map((c) => (c.id === id ? crop : c));
      localStore.save(snap);

      return {
        crop,
        activity: {
          id: nextId("act"),
          type: "crop-added",
          message: `${crop.name} details updated`,
          at: new Date().toISOString(),
          farmId: crop.farmId,
          cropId: crop.id,
        },
      };
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const index = snap.crops.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Crop not found");
    const existing = snap.crops[index];
    const crop: Crop = {
      ...existing,
      name: input.name ?? existing.name,
      variety: input.variety ?? existing.variety,
      farmId: input.farmId ?? existing.farmId,
      plantingDate: input.plantingDate ?? existing.plantingDate,
      growthStage: input.growthStage ?? existing.growthStage,
      fieldArea: input.fieldArea ?? existing.fieldArea,
      expectedYield: input.expectedYield ?? existing.expectedYield,
      irrigation: input.irrigation ?? existing.irrigation,
      notes: input.notes ?? existing.notes,
    };
    snap.crops[index] = crop;
    localStore.save(snap);
    return {
      crop,
      activity: {
        id: nextId("act"),
        type: "crop-added",
        message: `${crop.name} details updated`,
        at: new Date().toISOString(),
        farmId: crop.farmId,
        cropId: crop.id,
      },
    };
  },

  async deleteCrop(id) {
    if (API_CONFIG.mode === "live") {
      await apiRequest<{ success: boolean; message: string }>(`/crops/${id}`, {
        method: "DELETE",
      });
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const crop = snap.crops.find((c) => c.id === id);
    snap.crops = snap.crops.filter((c) => c.id !== id);
    localStore.save(snap);

    return {
      id,
      activity: {
        id: nextId("act"),
        type: "crop-added",
        message: `${crop?.name ?? "A crop"} record removed from the plan`,
        at: new Date().toISOString(),
        farmId: crop?.farmId,
        cropId: id,
      },
    };
  },

  async listRecommendations(params?: {
    status?: string;
    priority?: string;
    category?: string;
    farmId?: string;
    cropId?: string;
    page?: number;
    limit?: number;
  }) {
    if (API_CONFIG.mode === "live") {
      try {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.set("status", params.status);
        if (params?.priority) queryParams.set("priority", params.priority);
        if (params?.category) queryParams.set("category", params.category);
        if (params?.farmId) queryParams.set("farmId", params.farmId);
        if (params?.cropId) queryParams.set("cropId", params.cropId);
        if (params?.page) queryParams.set("page", String(params.page));
        if (params?.limit) queryParams.set("limit", String(params.limit));

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const res = await apiRequest<{
          success: boolean;
          data: { items: Recommendation[]; pagination: any };
        }>(`/recommendations${queryString}`);

        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] Unable to list live recommendations, falling back to local:", err);
      }
    }
    await wait(180);
    return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },

  async refreshRecommendations(farmId?: string) {
    if (API_CONFIG.mode === "live") {
      const res = await apiRequest<{
        success: boolean;
        data: { created: number; updated: number; retained: number; skipped: number; total: number };
      }>("/recommendations/refresh", {
        method: "POST",
        body: JSON.stringify(farmId ? { farmId } : {}),
      });
      return res.data;
    }
    await wait(250);
    return { created: 0, updated: 0, retained: 0, skipped: 0, total: 0 };
  },

  async listForecasts(params) {
    if (API_CONFIG.mode === "live") {
      try {
        const query = new URLSearchParams();
        if (params?.farmId) query.set("farmId", params.farmId);
        if (params?.cropId) query.set("cropId", params.cropId);
        if (params?.readinessStatus) query.set("readinessStatus", params.readinessStatus);
        const qs = query.toString() ? `?${query.toString()}` : "";
        const res = await apiRequest<{ success: boolean; data: { forecasts: Forecast[] } }>(
          `/forecasts${qs}`
        );
        if (Array.isArray(res?.data?.forecasts)) {
          return res.data.forecasts.map(normalizeForecast);
        }
      } catch (err) {
        console.warn("[HarvestWindow API] Live listForecasts failed, using fallback:", err);
      }
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const weather: Record<string, ReturnType<typeof weatherService.snapshotForFarm>> = {};
    for (const f of snap.farms) weather[f.id] = weatherService.snapshotForFarm(f);
    let targetCrops = snap.crops;
    if (params?.farmId) targetCrops = targetCrops.filter((c) => c.farmId === params.farmId);
    if (params?.cropId) targetCrops = targetCrops.filter((c) => c.id === params.cropId);
    const computed = computeForecasts(targetCrops, weather);
    let list = Object.values(computed);
    if (params?.readinessStatus) {
      list = list.filter((f) => f.readinessStatus === params.readinessStatus);
    }
    return list;
  },

  async getForecast(cropId) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: Forecast }>(`/forecasts/${cropId}`);
        if (res?.data) return normalizeForecast(res.data);
      } catch (err) {
        console.warn(`[HarvestWindow API] Live getForecast failed for ${cropId}:`, err);
      }
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const crop = snap.crops.find((c) => c.id === cropId);
    if (!crop) throw new Error("Crop not found");
    const farm = snap.farms.find((f) => f.id === crop.farmId);
    const weather = farm ? weatherService.snapshotForFarm(farm) : null;
    return computeForecast(crop, weather);
  },

  async refreshForecasts(scope) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{
          success: boolean;
          message: string;
          data: { processed: number; updated: number; failed: number; forecasts: Forecast[] };
        }>("/forecasts/refresh", {
          method: "POST",
          body: JSON.stringify(scope || {}),
        });
        if (res?.data) {
          return {
            ...res.data,
            forecasts: Array.isArray(res.data.forecasts)
              ? res.data.forecasts.map(normalizeForecast)
              : [],
          };
        }
      } catch (err) {
        console.warn("[HarvestWindow API] Live refreshForecasts failed, using client recalculation:", err);
      }
    }

    await wait(300);
    const snap = localStore.load() ?? buildSeedSnapshot();
    const weather: Record<string, ReturnType<typeof weatherService.snapshotForFarm>> = {};
    for (const f of snap.farms) weather[f.id] = weatherService.snapshotForFarm(f);
    let targetCrops = snap.crops;
    if (scope?.farmId) targetCrops = targetCrops.filter((c) => c.farmId === scope.farmId);
    if (scope?.cropId) targetCrops = targetCrops.filter((c) => c.id === scope.cropId);
    const computed = computeForecasts(targetCrops, weather);
    const list = Object.values(computed);
    return {
      processed: list.length,
      updated: list.length,
      failed: 0,
      forecasts: list,
    };
  },

  async setRecommendationStatus(id, status) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{
          success: boolean;
          data: Recommendation;
        }>(`/recommendations/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        return { id: res.data.id, status: res.data.status };
      } catch (err) {
        console.warn("[HarvestWindow API] Live update recommendation status failed, using optimistic state:", err);
      }
    }
    await wait(220);
    return { id, status };
  },

  async getDashboard() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: DashboardData }>("/dashboard");
        if (res?.data) return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] Live getDashboard failed, falling back to local computation:", err);
      }
    }

    await wait(200);
    const snap = localStore.load() ?? buildSeedSnapshot();
    const weather: Record<string, ReturnType<typeof weatherService.snapshotForFarm>> = {};
    for (const f of snap.farms) weather[f.id] = weatherService.snapshotForFarm(f);
    const forecasts = computeForecasts(snap.crops, weather);

    let totalTrackedArea = 0;
    for (const f of snap.farms) totalTrackedArea += f.area || 0;

    const activeCrops = snap.crops.filter((c) => (c.growthStage || "").toLowerCase() !== "harvested");
    let approaching = 0;
    let ready = 0;
    let overdue = 0;
    for (const c of activeCrops) {
      const fc = forecasts[c.id];
      if (!fc) continue;
      if (fc.readinessStatus === "approaching") approaching++;
      else if (fc.readinessStatus === "in-window") ready++;
      else if (fc.readinessStatus === "passed") overdue++;
    }

    const upcoming = Object.values(forecasts)
      .filter((fc) => fc.daysToWindowStart >= 0 || fc.daysToWindowEnd >= 0)
      .sort((a, b) => a.daysToWindowStart - b.daysToWindowStart)
      .map((fc) => {
        const crop = snap.crops.find((c) => c.id === fc.cropId);
        const farm = snap.farms.find((f) => f.id === crop?.farmId);
        return {
          cropId: fc.cropId,
          cropName: crop?.name || "Unknown",
          variety: crop?.variety || null,
          farmId: farm?.id || "",
          farmName: farm?.name || "",
          district: farm?.district || "",
          sowingDate: crop?.plantingDate || null,
          harvestWindow: { startDate: fc.estimatedWindowStart, typicalDate: fc.estimatedWindowStart, endDate: fc.estimatedWindowEnd },
          readinessStatus: fc.readinessStatus,
          readinessLevel: fc.readinessStatus.toUpperCase(),
          confidenceScore: fc.confidence || 75,
          confidenceLevel: "MEDIUM",
          daysToWindowStart: fc.daysToWindowStart,
          daysToWindowEnd: fc.daysToWindowEnd,
          daysUntilHarvest: fc.daysToWindowStart,
          weatherAdjustmentStatus: "UNAVAILABLE",
          weatherAdjustmentApplied: false,
        };
      });

    return {
      overview: {
        totalFarms: snap.farms.length,
        totalTrackedArea: Math.round(totalTrackedArea * 10) / 10,
        totalActiveCrops: activeCrops.length,
        approachingHarvest: approaching,
        readyForHarvest: ready,
        overdueHarvests: overdue,
      },
      cropStatusDistribution: [] as { stage: string; count: number; label?: string }[],
      readinessDistribution: [
        { status: "growing", label: "Developing", count: activeCrops.length - approaching - ready - overdue },
        { status: "approaching", label: "Approaching", count: approaching },
        { status: "in-window", label: "Ready (In Window)", count: ready },
        { status: "passed", label: "Harvest Window Passed", count: overdue },
      ],
      upcomingHarvests: upcoming,
      recentActivity: (snap.activity || []).map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        timestamp: a.at,
        at: a.at,
        farmId: a.farmId || null,
        cropId: a.cropId || null,
      })),
      forecastSummary: {
        totalForecasts: Object.keys(forecasts).length,
        weatherAdjustedCount: 0,
        baselineOnlyCount: Object.keys(forecasts).length,
        nextUpcomingDate: upcoming[0]?.harvestWindow.startDate || null,
      },
    };
  },

  async getSettings() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: SettingsData }>("/settings");
        if (res?.data) return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] Live getSettings failed:", err);
      }
    }

    const snap = localStore.load() ?? buildSeedSnapshot();
    return {
      profile: {
        id: snap.user?.id || "demo-user",
        name: snap.user?.fullName || "Farm Manager",
        email: snap.user?.email || "demo@harvestwindow.local",
        role: snap.user?.role || "FARMER",
        createdAt: new Date().toISOString(),
      },
      preferences: {
        areaUnit: snap.settings?.areaUnit || "hectare",
        temperatureUnit: "celsius",
        language: snap.settings?.language || "en",
        defaultFarmId: snap.settings?.defaultFarmId || null,
        notifications: snap.settings?.notifications || {
          harvestWindowAlerts: true,
          weatherCautions: true,
          weeklySummary: false,
        },
      },
    };
  },

  async saveSettings(settings) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: SettingsData }>("/settings", {
          method: "PATCH",
          body: JSON.stringify({
            areaUnit: settings.areaUnit,
            language: settings.language,
            defaultFarmId: settings.defaultFarmId,
            notifications: settings.notifications,
          }),
        });
        if (res?.data?.preferences) {
          const snap = localStore.load() ?? buildSeedSnapshot();
          snap.settings = { ...snap.settings, ...settings };
          localStore.save(snap);
          return settings;
        }
      } catch (err) {
        console.warn("[HarvestWindow API] Live saveSettings failed, updating local store:", err);
      }
    }

    await wait(200);
    const snap = localStore.load() ?? buildSeedSnapshot();
    snap.settings = { ...snap.settings, ...settings };
    localStore.save(snap);
    return settings;
  },

  async updateProfile(input) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: { user: any } }>("/users/profile", {
          method: "PATCH",
          body: JSON.stringify({ name: input.fullName || input.name }),
        });
        if (res?.data?.user) {
          const snap = localStore.load() ?? buildSeedSnapshot();
          snap.user = { ...snap.user, fullName: res.data.user.name, name: res.data.user.name };
          localStore.save(snap);
          return res.data;
        }
      } catch (err) {
        console.warn("[HarvestWindow API] Live updateProfile failed:", err);
      }
    }

    await wait(200);
    const snap = localStore.load() ?? buildSeedSnapshot();
    snap.user = { ...snap.user, fullName: input.fullName || input.name || snap.user.fullName };
    localStore.save(snap);
    return { user: snap.user };
  },

  async resetDemoData() {
    await wait(320);
    localStore.clear();
    return buildSeedSnapshot();
  },

  async getFarmWeather(farmId: string, refresh = false) {
    const query = refresh ? "?refresh=true" : "";
    const res = await apiRequest<{
      success: boolean;
      data: any;
    }>(`/weather/${farmId}${query}`);
    return res.data;
  },

  async getCurrentLocationWeather(latitude: number, longitude: number) {
    const res = await apiRequest<{
      success: boolean;
      data: any;
    }>(`/weather/current?latitude=${latitude}&longitude=${longitude}`);
    return res.data;
  },

  async listActivities(params) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.type) q.set("type", params.type);
        if (params?.farmId) q.set("farmId", params.farmId);
        if (params?.cropId) q.set("cropId", params.cropId);
        const query = q.toString() ? `?${q.toString()}` : "";
        const res = await apiRequest<{ success: boolean; data: any }>(`/activity${query}`);
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.items)) return res.data.items;
      } catch (err) {
        console.warn("[HarvestWindow API] listActivities live request failed:", err);
      }
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    return snap.activity || [];
  },

  async listNotifications(params) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        if (typeof params?.isRead === "boolean") q.set("isRead", String(params.isRead));
        if (params?.type) q.set("type", params.type);
        const query = q.toString() ? `?${q.toString()}` : "";
        const res = await apiRequest<{ success: boolean; data: any; items?: any[] }>(`/notifications${query}`);
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.items)) return res.data.items;
        if (Array.isArray(res?.items)) return res.items;
      } catch (err) {
        console.warn("[HarvestWindow API] listNotifications live request failed:", err);
      }
    }
    return [];
  },

  async getUnreadNotificationCount() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data?: { unreadCount: number }; unreadCount?: number }>("/notifications/unread-count");
        return res?.unreadCount ?? res?.data?.unreadCount ?? 0;
      } catch (err) {
        console.warn("[HarvestWindow API] getUnreadNotificationCount failed:", err);
      }
    }
    return 0;
  },

  async markNotificationRead(id: string) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: BackendNotification }>(`/notifications/${id}/read`, {
          method: "PATCH",
        });
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] markNotificationRead failed:", err);
      }
    }
    return { id, isRead: true } as BackendNotification;
  },

  async markAllNotificationsRead() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: { updatedCount: number } }>("/notifications/read-all", {
          method: "PATCH",
        });
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] markAllNotificationsRead failed:", err);
      }
    }
    return { updatedCount: 0 };
  },

  async syncAlerts() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: { generated: number } }>("/notifications/sync-alerts", {
          method: "POST",
        });
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] syncAlerts failed:", err);
      }
    }
    return { generated: 0 };
  },

  // --- Phase AI-1: Agricultural Knowledge Base ---
  async listAgriCrops(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    season?: string;
    state?: string;
    district?: string;
    hasGrowthProfile?: boolean;
  } = {}) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params.page) q.set("page", String(params.page));
        if (params.limit) q.set("limit", String(params.limit));
        if (params.search) q.set("search", params.search);
        if (params.category) q.set("category", params.category);
        if (params.season) q.set("season", params.season);
        if (params.state) q.set("state", params.state);
        if (params.district) q.set("district", params.district);
        if (params.hasGrowthProfile !== undefined) q.set("hasGrowthProfile", String(params.hasGrowthProfile));
        const res = await apiRequest<{ success: boolean; data: { crops: AgriCrop[]; pagination: unknown } }>(
          `/agriculture/crops?${q.toString()}`
        );
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] listAgriCrops failed:", err);
      }
    }
    return { crops: [] as AgriCrop[], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  },

  async getAgriCrop(cropId: string) {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: AgriCrop }>(`/agriculture/crops/${cropId}`);
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] getAgriCrop failed:", err);
      }
    }
    return null;
  },

  async listAgriSeasons() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: AgriSeason[] }>("/agriculture/seasons");
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] listAgriSeasons failed:", err);
      }
    }
    return [] as AgriSeason[];
  },

  async listAgriRegions(params: { state?: string; search?: string } = {}) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params.state) q.set("state", params.state);
        if (params.search) q.set("search", params.search);
        const res = await apiRequest<{
          success: boolean;
          data: { items: AgriRegion[]; pagination?: unknown } | AgriRegion[];
        }>(`/agriculture/regions?${q.toString()}`);
        if (!res?.data) return [] as AgriRegion[];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray((res.data as any).items)) return (res.data as any).items;
        return [] as AgriRegion[];
      } catch (err) {
        console.warn("[HarvestWindow API] listAgriRegions failed:", err);
      }
    }
    return [] as AgriRegion[];
  },

  async getCropCalendars(params: {
    crop?: string;
    cropId?: string;
    state?: string;
    district?: string;
    season?: string;
    year?: string;
  } = {}) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params.crop) q.set("crop", params.crop);
        if (params.cropId) q.set("cropId", params.cropId);
        if (params.state) q.set("state", params.state);
        if (params.district) q.set("district", params.district);
        if (params.season) q.set("season", params.season);
        if (params.year) q.set("year", params.year);
        const res = await apiRequest<{
          success: boolean;
          data: { items: AgriCropCalendar[]; pagination?: unknown } | AgriCropCalendar[];
        }>(`/agriculture/crop-calendar?${q.toString()}`);
        if (!res?.data) return [] as AgriCropCalendar[];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray((res.data as any).items)) return (res.data as any).items;
        return [] as AgriCropCalendar[];
      } catch (err) {
        console.warn("[HarvestWindow API] getCropCalendars failed:", err);
      }
    }
    return [] as AgriCropCalendar[];
  },

  async getCropGrowthProfiles(params: { crop?: string; cropId?: string; variety?: string } = {}) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params.crop) q.set("crop", params.crop);
        if (params.cropId) q.set("cropId", params.cropId);
        if (params.variety) q.set("variety", params.variety);
        const res = await apiRequest<{ success: boolean; data: AgriGrowthProfile[] }>(`/agriculture/crop-growth-profiles?${q.toString()}`);
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] getCropGrowthProfiles failed:", err);
      }
    }
    return [] as AgriGrowthProfile[];
  },

  async getCropSuitability(params: { crop?: string; cropId?: string } = {}) {
    if (API_CONFIG.mode === "live") {
      try {
        const q = new URLSearchParams();
        if (params.crop) q.set("crop", params.crop);
        if (params.cropId) q.set("cropId", params.cropId);
        const res = await apiRequest<{ success: boolean; data: AgriSuitabilityProfile[] }>(`/agriculture/crop-suitability?${q.toString()}`);
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] getCropSuitability failed:", err);
      }
    }
    return [] as AgriSuitabilityProfile[];
  },

  async getDataSources() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: AgriDataSource[] }>("/agriculture/data-sources");
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] getDataSources failed:", err);
      }
    }
    return [] as AgriDataSource[];
  },

  async getAgriDataQuality() {
    if (API_CONFIG.mode === "live") {
      try {
        const res = await apiRequest<{ success: boolean; data: AgriDataQuality }>("/agriculture/data-quality");
        return res.data;
      } catch (err) {
        console.warn("[HarvestWindow API] getAgriDataQuality failed:", err);
      }
    }
    return null;
  },
};

/**
 * Authentication service methods connecting frontend to Phase 1 backend.
 */
export const authApi = {
  async login(email: string, password: string) {
    const res = await apiRequest<{
      success: boolean;
      data: { token: string; user: { id: string; email: string; fullName: string } };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.data.token);
    return res.data;
  },

  async register(input: { fullName: string; email: string; password?: string }) {
    const res = await apiRequest<{
      success: boolean;
      data: { token: string; user: { id: string; email: string; fullName: string } };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: input.fullName,
        email: input.email,
        password: input.password || "harvest-demo-pass",
      }),
    });
    setAuthToken(res.data.token);
    return res.data;
  },

  async startDemoSession() {
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { token: string; user: { id: string; email: string; fullName: string } };
      }>("/auth/demo", {
        method: "POST",
      });
      setAuthToken(res.data.token);
      return res.data;
    } catch {
      return null;
    }
  },
};

/** Convenience: weather + forecasts for a set of farms/crops in one call. */
export function buildIntelligence(
  farms: Farm[],
  crops: Crop[],
  overrideForecasts?: Record<string, Forecast>
): ForecastBundle {
  const weather: Record<string, ReturnType<typeof weatherService.snapshotForFarm>> = {};
  for (const farm of farms) weather[farm.id] = weatherService.snapshotForFarm(farm);
  return {
    weather,
    forecasts: overrideForecasts && Object.keys(overrideForecasts).length > 0
      ? { ...computeForecasts(crops, weather), ...overrideForecasts }
      : computeForecasts(crops, weather),
  };
}

export const newActivityId = () => nextId("act");
