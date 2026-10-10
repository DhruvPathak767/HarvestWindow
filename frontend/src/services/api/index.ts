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
  setRecommendationStatus(
    id: string,
    status: RecommendationStatus
  ): Promise<{ id: string; status: RecommendationStatus }>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  resetDemoData(): Promise<PersistedSnapshot>;
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
        let liveCrops: Crop[] = [];
        try {
          liveCrops = await this.listCrops();
        } catch (cropErr) {
          console.warn("[HarvestWindow API] Unable to fetch live crops during snapshot load:", cropErr);
        }

        const farmsToUse = Array.isArray(liveFarms) ? liveFarms : baseSnapshot.farms;
        const farmIdSet = new Set(farmsToUse.map((f) => f.id));
        const cropsToUse =
          Array.isArray(liveCrops) && liveCrops.length > 0
            ? liveCrops
            : isDemo
              ? baseSnapshot.crops
              : baseSnapshot.crops.filter((c) => farmIdSet.has(c.farmId));

        return {
          ...baseSnapshot,
          farms: farmsToUse,
          crops: cropsToUse,
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
          return res.data.forecasts;
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
        if (res?.data) return res.data;
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
        if (res?.data) return res.data;
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
