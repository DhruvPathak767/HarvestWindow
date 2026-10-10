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
  DEMO_CREDENTIALS,
  DEMO_USER,
  SEED_ACTIVITY,
  SEED_CROPS,
  SEED_FARMS,
  SEED_RECOMMENDATIONS,
} from "@/data/mock/seed";

const DEMO_STORAGE_KEY = "harvestwindow.demo.v1";

export function getStorageKey(userEmailOrId?: string | null): string {
  if (userEmailOrId && userEmailOrId !== DEMO_CREDENTIALS.email) {
    const cleanKey = userEmailOrId.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
    return `harvestwindow.user.${cleanKey}`;
  }
  return DEMO_STORAGE_KEY;
}

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

/**
 * Returns pre-populated snapshot intended ONLY for exploratory demo sessions.
 */
export function buildSeedSnapshot(): PersistedSnapshot {
  return {
    version: 1,
    farms: structuredClone(SEED_FARMS),
    crops: structuredClone(SEED_CROPS),
    recommendations: structuredClone(SEED_RECOMMENDATIONS),
    activity: structuredClone(SEED_ACTIVITY),
    settings: {
      ...DEFAULT_SETTINGS,
      defaultFarmId: "farm-greenridge",
    },
    user: structuredClone(DEMO_USER),
    signedIn: false,
    onboarded: false,
  };
}

/**
 * Returns a pristine empty workspace for authenticated users.
 * Guarantees a new user starts with 0 farms and no cross-user data.
 */
export function buildEmptySnapshot(user?: Partial<UserProfile> | null): PersistedSnapshot {
  return {
    version: 1,
    farms: [],
    crops: [],
    recommendations: [],
    activity: [],
    settings: {
      ...DEFAULT_SETTINGS,
      defaultFarmId: null,
    },
    user: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      role: user?.role || "FARMER",
      organisation: user?.organisation || "Independent Producer",
    },
    signedIn: !!user?.email,
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
  load(userEmailOrId?: string | null): PersistedSnapshot | null {
    if (!canUseStorage()) return null;
    try {
      const key = getStorageKey(userEmailOrId);
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedSnapshot>;
      if (parsed.version !== 1 || !Array.isArray(parsed.farms)) return null;
      const isDemo = !userEmailOrId || userEmailOrId === DEMO_CREDENTIALS.email;
      const fallback = isDemo ? buildSeedSnapshot() : buildEmptySnapshot({ email: userEmailOrId });
      return { ...fallback, ...parsed } as PersistedSnapshot;
    } catch {
      return null;
    }
  },

  save(snapshot: PersistedSnapshot, userEmailOrId?: string | null): void {
    if (!canUseStorage()) return;
    try {
      const targetUser = userEmailOrId || (snapshot.signedIn ? snapshot.user?.email : null);
      const key = getStorageKey(targetUser);
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      /* storage full or blocked — the app keeps running in memory */
    }
  },

  clear(userEmailOrId?: string | null): void {
    if (!canUseStorage()) return;
    try {
      const key = getStorageKey(userEmailOrId);
      window.localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  },
};
