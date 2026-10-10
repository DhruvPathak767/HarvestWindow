import type {
  ActivityEvent,
  AppSettings,
  Crop,
  Farm,
  Recommendation,
  UserProfile,
} from "@/types";
import {
  DEFAULT_SETTINGS,
  DEMO_USER,
  SEED_ACTIVITY,
  SEED_CROPS,
  SEED_FARMS,
  SEED_RECOMMENDATIONS,
} from "@/data/mock/seed";

/**
 * Local demo persistence.
 * Everything lives in `localStorage` — this is a frontend demo store,
 * not cloud synchronisation. Swapping `localStore` for an HTTP-backed
 * implementation is the only change needed to go live.
 */
const STORAGE_KEY = "harvestwindow.demo.v1";

export interface PersistedSnapshot {
  version: 1;
  farms: Farm[];
  crops: Crop[];
  recommendations: Recommendation[];
  activity: ActivityEvent[];
  settings: AppSettings;
  user: UserProfile;
  signedIn: boolean;
  onboarded: boolean;
}

export function buildSeedSnapshot(): PersistedSnapshot {
  return {
    version: 1,
    farms: structuredClone(SEED_FARMS),
    crops: structuredClone(SEED_CROPS),
    recommendations: structuredClone(SEED_RECOMMENDATIONS),
    activity: structuredClone(SEED_ACTIVITY),
    settings: structuredClone(DEFAULT_SETTINGS),
    user: structuredClone(DEMO_USER),
    signedIn: false,
    onboarded: false,
  };
}

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export const localStore = {
  load(): PersistedSnapshot | null {
    if (!canUseStorage()) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedSnapshot>;
      if (parsed.version !== 1 || !Array.isArray(parsed.farms)) return null;
      return { ...buildSeedSnapshot(), ...parsed } as PersistedSnapshot;
    } catch {
      return null;
    }
  },

  save(snapshot: PersistedSnapshot): void {
    if (!canUseStorage()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* storage full or blocked — the demo keeps running in memory */
    }
  },

  clear(): void {
    if (!canUseStorage()) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
  },
};
