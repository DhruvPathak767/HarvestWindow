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
 * Runtime configuration for API communication.
 * Default baseUrl points to the backend /api endpoint.
 * Mode is 'live' when a backend URL is configured, with seamless fallback to 'demo'.
 */
export const API_CONFIG = {
  baseUrl:
    (import.meta.env?.VITE_API_URL as string) || "http://localhost:5000/api",
  mode: ((import.meta.env?.VITE_API_MODE as string) || "live") as "demo" | "live",
  latencyMs: 380,
};

const TOKEN_STORAGE_KEY = "harvestwindow.auth.token";

export function getAuthToken(): string | null {
  try {
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

let idCounter = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** Contract shared by demo implementation and live HTTP client. */
export interface HarvestWindowApi {
  loadSnapshot(): Promise<PersistedSnapshot>;
  listFarms(): Promise<Farm[]>;
  getFarm(id: string): Promise<Farm>;
  createFarm(input: NewFarmInput): Promise<{ farm: Farm; activity: ActivityEvent }>;
  updateFarm(
    id: string,
    input: UpdateFarmInput
  ): Promise<{ farm: Farm; activity: ActivityEvent }>;
  deleteFarm(id: string): Promise<{ id: string; activity: ActivityEvent }>;
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
    const baseSnapshot = localStore.load() ?? buildSeedSnapshot();

    if (API_CONFIG.mode === "live") {
      try {
        const liveFarms = await this.listFarms();
        return {
          ...baseSnapshot,
          farms: liveFarms,
        };
      } catch (err) {
        console.warn(
          "[HarvestWindow API] Unable to fetch live farms during snapshot load, using cached demo data:",
          err
        );
        return baseSnapshot;
      }
    }

    await wait(300);
    return baseSnapshot;
  },

  async listFarms() {
    if (API_CONFIG.mode === "live") {
      const res = await apiRequest<{ success: boolean; data: Farm[] }>("/farms");
      return res.data;
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    return snap.farms;
  },

  async getFarm(id: string) {
    if (API_CONFIG.mode === "live") {
      const res = await apiRequest<{ success: boolean; data: Farm }>(`/farms/${id}`);
      return res.data;
    }
    const snap = localStore.load() ?? buildSeedSnapshot();
    const farm = snap.farms.find((f) => f.id === id);
    if (!farm) throw new Error("Farm not found");
    return farm;
  },

  async createFarm(input) {
    if (API_CONFIG.mode === "live") {
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
    }

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

  async updateFarm(id, input) {
    if (API_CONFIG.mode === "live") {
      const res = await apiRequest<{ success: boolean; data: Farm }>(`/farms/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
      const farm = res.data;
      return {
        farm,
        activity: {
          id: nextId("act"),
          type: "farm-added",
          message: `${farm.name} updated`,
          at: new Date().toISOString(),
          farmId: farm.id,
        },
      };
    }

    await wait();
    const snap = localStore.load() ?? buildSeedSnapshot();
    const existing = snap.farms.find((f) => f.id === id);
    if (!existing) throw new Error("Farm not found");

    const updated: Farm = {
      ...existing,
      name: input.name ?? existing.name,
      state: input.state ?? existing.state,
      district: input.district ?? existing.district,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      area: input.area ?? existing.area,
      areaUnit: input.areaUnit ?? existing.areaUnit,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    };

    return {
      farm: updated,
      activity: {
        id: nextId("act"),
        type: "farm-added",
        message: `${updated.name} updated`,
        at: new Date().toISOString(),
        farmId: updated.id,
      },
    };
  },

  async deleteFarm(id) {
    if (API_CONFIG.mode === "live") {
      await apiRequest<{ success: boolean; message: string }>(`/farms/${id}`, {
        method: "DELETE",
      });
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
    }

    await wait();
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
export function buildIntelligence(farms: Farm[], crops: Crop[]): ForecastBundle {
  const weather: Record<string, ReturnType<typeof weatherService.snapshotForFarm>> = {};
  for (const farm of farms) weather[farm.id] = weatherService.snapshotForFarm(farm);
  return {
    weather,
    forecasts: computeForecasts(crops, weather),
  };
}

export const newActivityId = () => nextId("act");
