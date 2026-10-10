import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEvent,
  AppSettings,
  Crop,
  Farm,
  Forecast,
  Recommendation,
  RecommendationStatus,
  UserProfile,
  WeatherSummary,
} from "@/types";
import {
  api,
  authApi,
  buildIntelligence,
  newActivityId,
  setAuthToken,
  type NewCropInput,
  type UpdateCropInput,
  type NewFarmInput,
  type UpdateFarmInput,
} from "@/services/api";
import { localStore, type PersistedSnapshot } from "@/services/storage/localStore";
import { DEFAULT_SETTINGS, DEMO_CREDENTIALS, DEMO_USER } from "@/data/mock/seed";
import { setLocale } from "@/utils/date";
import { useToast } from "@/components/feedback/ToastProvider";
import { authClient } from "@/services/api/authClient";

export const ALL_FARMS = "all" as const;
export type FarmSelection = string | typeof ALL_FARMS;

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  kind: "weather" | "forecast" | "activity";
  farmId?: string;
  cropId?: string;
}

export interface OnboardingDraft {
  farmName: string;
  state: string;
  district: string;
  area: number;
  areaUnit: Farm["areaUnit"];
  cropName: string;
  variety: string;
  plantingDate: string;
  growthStage: string;
}

interface StoreValue {
  ready: boolean;
  loadError: string | null;
  retryLoad: () => void;

  signedIn: boolean;
  user: UserProfile;
  onboarded: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;

  farms: Farm[];
  crops: Crop[];
  recommendations: Recommendation[];
  activity: ActivityEvent[];
  settings: AppSettings;
  weather: Record<string, WeatherSummary>;
  forecasts: Record<string, Forecast>;
  notifications: AppNotification[];
  unreadCount: number;

  selectedFarmId: FarmSelection;
  selectFarm: (id: FarmSelection) => void;

  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  startDemoSession: () => void;
  signUp: (input: {
    fullName: string;
    email: string;
    password?: string;
    role?: "FARMER" | "SELLER";
  }) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => void;

  completeOnboarding: (draft: OnboardingDraft) => Promise<void>;
  addFarm: (input: NewFarmInput) => Promise<Farm>;
  updateFarm: (id: string, input: UpdateFarmInput) => Promise<Farm>;
  deleteFarm: (id: string) => Promise<void>;
  fetchFarm: (id: string) => Promise<Farm | null>;
  refreshFarms: () => Promise<Farm[]>;
  addCrop: (input: NewCropInput) => Promise<Crop>;
  updateCrop: (id: string, input: UpdateCropInput) => Promise<Crop>;
  removeCrop: (cropId: string) => Promise<void>;
  fetchCrop: (cropId: string) => Promise<Crop | null>;
  refreshCrops: (farmId?: string) => Promise<Crop[]>;
  setRecommendationStatus: (id: string, status: RecommendationStatus) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  refreshForecasts: (scope?: string) => void;
  resetDemoData: () => Promise<void>;
  markNotificationsRead: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY_SNAPSHOT: PersistedSnapshot = {
  version: 1,
  farms: [],
  crops: [],
  recommendations: [],
  activity: [],
  settings: DEFAULT_SETTINGS,
  user: DEMO_USER,
  signedIn: false,
  onboarded: false,
};

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<PersistedSnapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<FarmSelection>(ALL_FARMS);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    setReady(false);
    setLoadError(null);
    try {
      const data = await api.loadSnapshot();

      // Restore authentication from server state rather than trusting local storage
      try {
        const authResult = await authClient.getMe();
        if (authResult?.user) {
          data.signedIn = true;
          data.user = {
            fullName: authResult.user.name,
            email: authResult.user.email,
            role: authResult.user.role,
            organisation: data.user?.organisation || "HarvestWindow Farm",
          };
        } else {
          data.signedIn = false;
        }
      } catch {
        // No active or valid session exists on server
        data.signedIn = false;
      }

      setSnapshot(data);
      hydrated.current = true;
      setSelectedFarmId(data.settings.defaultFarmId ?? data.farms[0]?.id ?? ALL_FARMS);
      setReady(true);
    } catch {
      setLoadError(
        "We could not load the workspace data. Your browser storage may be blocked."
      );
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Persist the demo snapshot locally (never cloud-synced in this frontend).
  useEffect(() => {
    if (!hydrated.current) return;
    localStore.save(snapshot);
  }, [snapshot]);

  // Language preference drives date/number formatting across the workspace.
  useEffect(() => {
    setLocale(snapshot.settings.language);
  }, [snapshot.settings.language]);

  const patch = useCallback(
    (updater: (prev: PersistedSnapshot) => PersistedSnapshot) =>
      setSnapshot((prev) => updater(prev)),
    []
  );

  const intelligence = useMemo(
    () => buildIntelligence(snapshot.farms, snapshot.crops),
    [snapshot.farms, snapshot.crops]
  );

  const notifications = useMemo<AppNotification[]>(() => {
    const out: AppNotification[] = [];

    for (const farm of snapshot.farms) {
      const weather = intelligence.weather[farm.id];
      if (!weather) continue;
      for (const caution of weather.cautions) {
        out.push({
          id: `${caution.id}-${farm.id}`,
          title: caution.title,
          body: `${farm.name} · ${caution.detail}`,
          at: weather.observedAt,
          kind: "weather",
          farmId: farm.id,
        });
      }
    }

    for (const event of snapshot.activity.slice(0, 5)) {
      out.push({
        id: event.id,
        title: event.message,
        body: "Recent activity on your plan",
        at: event.at,
        kind: "activity",
        farmId: event.farmId,
        cropId: event.cropId,
      });
    }

    return out.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    ).slice(0, 8);
  }, [snapshot.farms, snapshot.activity, intelligence.weather]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readNotificationIds.includes(n.id)).length,
    [notifications, readNotificationIds]
  );

  const pushActivity = useCallback(
    (event: ActivityEvent) =>
      patch((prev) => ({ ...prev, activity: [event, ...prev.activity].slice(0, 40) })),
    [patch]
  );

  /* ---------------------------------------------------------------- auth */

  const signIn = useCallback<StoreValue["signIn"]>(
    async (email, password) => {
      const normalized = email.trim().toLowerCase();
      try {
        const result = await authClient.login({ email, password });
        if (result.accessToken) {
          setAuthToken(result.accessToken);
        }
        patch((prev) => ({
          ...prev,
          signedIn: true,
          user: {
            fullName: result.user.name,
            email: result.user.email,
            role: result.user.role,
            organisation: prev.user?.organisation || "HarvestWindow Farm",
          },
        }));
        return { ok: true };
      } catch (err: unknown) {
        // Fallback to demo credentials if offline or local demo
        if (normalized === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          patch((prev) => ({ ...prev, signedIn: true, user: DEMO_USER }));
          return { ok: true };
        }
        const message =
          err instanceof Error
            ? err.message
            : "Sign in failed. Please check your credentials.";
        return {
          ok: false,
          message,
        };
      }
    },
    [patch]
  );

  const startDemoSession = useCallback(async () => {
    try {
      await authApi.startDemoSession();
    } catch {
      /* ignore offline */
    }
    patch((prev) => ({ ...prev, signedIn: true, user: DEMO_USER }));
  }, [patch]);

  const signUp = useCallback<StoreValue["signUp"]>(
    async ({ fullName, email, password, role = "FARMER" }) => {
      try {
        const effectivePassword = password || "Password123!";
        await authClient.register({
          name: fullName,
          email,
          password: effectivePassword,
          role,
        });

        // Automatically authenticate using the exact same secure login verification
        const result = await authClient.login({ email, password: effectivePassword });
        if (result.accessToken) {
          setAuthToken(result.accessToken);
        }

        patch((prev) => ({
          ...prev,
          signedIn: true,
          user: {
            fullName: result.user.name,
            email: result.user.email,
            role: result.user.role,
            organisation: role === "SELLER" ? "Merchant / Trading" : "Independent Producer",
          },
        }));
        return { ok: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Registration failed. Please check your inputs.";
        return {
          ok: false,
          message,
        };
      }
    },
    [patch]
  );

  const signOut = useCallback(() => {
    void authClient.logout();
    setAuthToken(null);
    patch((prev) => ({ ...prev, signedIn: false }));
    setShowOnboarding(false);
  }, [patch]);

  /* ------------------------------------------------------------ onboarding */

  useEffect(() => {
    if (ready && snapshot.signedIn && !snapshot.onboarded && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [ready, snapshot.signedIn, snapshot.onboarded, showOnboarding]);

  const completeOnboarding = useCallback<StoreValue["completeOnboarding"]>(
    async (draft) => {
      const { farm } = await api.createFarm({
        name: draft.farmName,
        state: draft.state,
        district: draft.district,
        area: draft.area,
        areaUnit: draft.areaUnit,
      });
      const { crop } = await api.createCrop({
        name: draft.cropName,
        variety: draft.variety,
        farmId: farm.id,
        plantingDate: draft.plantingDate,
        growthStage: draft.growthStage,
        fieldArea: draft.area,
        irrigation: "mixed",
      });

      patch((prev) => ({
        ...prev,
        farms: [...prev.farms, farm],
        crops: [...prev.crops, crop],
        onboarded: true,
        settings: { ...prev.settings, defaultFarmId: farm.id },
        recommendations: [
          {
            id: `rec-${crop.id}`,
            cropId: crop.id,
            farmId: farm.id,
            title: `Log the first stage observation for ${crop.name}`,
            reason:
              "The estimate for this block currently uses the planting date and reference durations only.",
            priority: "medium",
            suggestedAction:
              "Walk the block this week and record the growth stage you can see in the field.",
            status: "open",
            createdAt: new Date().toISOString(),
            category: "monitoring",
          },
          ...prev.recommendations,
        ],
        activity: [
          {
            id: newActivityId(),
            type: "crop-added" as const,
            message: `${crop.name} added to ${farm.name} during setup`,
            at: new Date().toISOString(),
            farmId: farm.id,
            cropId: crop.id,
          },
          {
            id: newActivityId(),
            type: "forecast-refreshed" as const,
            message: `First harvest estimate generated for ${farm.name}`,
            at: new Date().toISOString(),
            farmId: farm.id,
            cropId: crop.id,
          },
          ...prev.activity,
        ].slice(0, 40),
      }));

      setSelectedFarmId(farm.id);
      setShowOnboarding(false);
      toast({
        tone: "success",
        title: "Your first forecast is ready",
        description: `${crop.name} on ${farm.name} now has an estimated harvest window.`,
      });
    },
    [patch, toast]
  );

  /* ------------------------------------------------------------- farming */

  const addFarm = useCallback<StoreValue["addFarm"]>(
    async (input) => {
      const { farm, activity } = await api.createFarm(input);
      patch((prev) => ({
        ...prev,
        farms: [...prev.farms, farm],
        activity: [activity, ...prev.activity].slice(0, 40),
        settings: prev.settings.defaultFarmId ? prev.settings : { ...prev.settings, defaultFarmId: farm.id },
      }));
      setSelectedFarmId(farm.id);
      toast({
        tone: "success",
        title: `${farm.name} added`,
        description: `${farm.district}, ${farm.state} · ${farm.area} ${farm.areaUnit}s`,
      });
      return farm;
    },
    [patch, toast]
  );

  const updateFarm = useCallback<StoreValue["updateFarm"]>(
    async (id, input) => {
      const { farm, activity } = await api.updateFarm(id, input);
      patch((prev) => ({
        ...prev,
        farms: prev.farms.map((f) => (f.id === id ? farm : f)),
        activity: [activity, ...prev.activity].slice(0, 40),
      }));
      toast({
        tone: "success",
        title: `${farm.name} updated`,
        description: "Farm details saved successfully.",
      });
      return farm;
    },
    [patch, toast]
  );

  const deleteFarm = useCallback<StoreValue["deleteFarm"]>(
    async (id) => {
      const existing = snapshot.farms.find((f) => f.id === id);
      const { activity } = await api.deleteFarm(id);
      patch((prev) => {
        const nextFarms = prev.farms.filter((f) => f.id !== id);
        const nextDefaultFarmId =
          prev.settings.defaultFarmId === id
            ? (nextFarms[0]?.id ?? null)
            : prev.settings.defaultFarmId;
        return {
          ...prev,
          farms: nextFarms,
          settings: { ...prev.settings, defaultFarmId: nextDefaultFarmId },
          activity: [activity, ...prev.activity].slice(0, 40),
        };
      });
      setSelectedFarmId((curr) => (curr === id ? ALL_FARMS : curr));
      toast({
        tone: "info",
        title: `${existing?.name ?? "Farm"} deleted`,
        description: "Farm record removed from workspace.",
      });
    },
    [patch, snapshot.farms, toast]
  );

  const fetchFarm = useCallback<StoreValue["fetchFarm"]>(
    async (id) => {
      try {
        const farm = await api.getFarm(id);
        patch((prev) => {
          const exists = prev.farms.some((f) => f.id === id);
          return {
            ...prev,
            farms: exists ? prev.farms.map((f) => (f.id === id ? farm : f)) : [...prev.farms, farm],
          };
        });
        return farm;
      } catch {
        return null;
      }
    },
    [patch]
  );

  const refreshFarms = useCallback<StoreValue["refreshFarms"]>(async () => {
    try {
      const liveFarms = await api.listFarms();
      patch((prev) => ({ ...prev, farms: liveFarms }));
      return liveFarms;
    } catch {
      return snapshot.farms;
    }
  }, [patch, snapshot.farms]);

  const addCrop = useCallback<StoreValue["addCrop"]>(
    async (input) => {
      const { crop, activity } = await api.createCrop(input);
      patch((prev) => ({
        ...prev,
        crops: [...prev.crops.filter((c) => c.id !== crop.id), crop],
        activity: [activity, ...prev.activity].slice(0, 40),
      }));
      toast({
        tone: "success",
        title: `${crop.name} added`,
        description: "An estimated harvest window has been generated for this block.",
      });
      return crop;
    },
    [patch, toast]
  );

  const updateCrop = useCallback<StoreValue["updateCrop"]>(
    async (id, input) => {
      const { crop, activity } = await api.updateCrop(id, input);
      patch((prev) => ({
        ...prev,
        crops: prev.crops.map((c) => (c.id === id ? crop : c)),
        activity: [activity, ...prev.activity].slice(0, 40),
      }));
      toast({
        tone: "success",
        title: `${crop.name} updated`,
        description: "Crop details and harvest timeline have been refreshed.",
      });
      return crop;
    },
    [patch, toast]
  );

  const removeCrop = useCallback<StoreValue["removeCrop"]>(
    async (cropId) => {
      try {
        const { activity } = await api.deleteCrop(cropId);
        patch((prev) => ({
          ...prev,
          crops: prev.crops.filter((c) => c.id !== cropId),
          recommendations: prev.recommendations.filter((r) => r.cropId !== cropId),
          activity: [activity, ...prev.activity].slice(0, 40),
        }));
        toast({ tone: "info", title: "Crop record removed" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete crop";
        toast({ tone: "danger", title: "Delete failed", description: msg });
        throw err;
      }
    },
    [patch, toast]
  );

  const fetchCrop = useCallback<StoreValue["fetchCrop"]>(
    async (cropId) => {
      try {
        const crop = await api.getCrop(cropId);
        if (crop) {
          patch((prev) => ({
            ...prev,
            crops: prev.crops.some((c) => c.id === crop.id)
              ? prev.crops.map((c) => (c.id === crop.id ? crop : c))
              : [...prev.crops, crop],
          }));
        }
        return crop;
      } catch {
        return null;
      }
    },
    [patch]
  );

  const refreshCrops = useCallback<StoreValue["refreshCrops"]>(
    async (farmId) => {
      const liveCrops = await api.listCrops(farmId ? { farmId } : undefined);
      patch((prev) => ({
        ...prev,
        crops: liveCrops,
      }));
      return liveCrops;
    },
    [patch]
  );

  const setRecommendationStatus = useCallback<StoreValue["setRecommendationStatus"]>(
    async (id, status) => {
      const rec = snapshot.recommendations.find((r) => r.id === id);
      patch((prev) => ({
        ...prev,
        recommendations: prev.recommendations.map((r) =>
          r.id === id ? { ...r, status } : r
        ),
        activity:
          status === "completed" && rec
            ? [
                {
                  id: newActivityId(),
                  type: "recommendation-completed" as const,
                  message: `Completed: ${rec.title}`,
                  at: new Date().toISOString(),
                  farmId: rec.farmId,
                  cropId: rec.cropId,
                },
                ...prev.activity,
              ].slice(0, 40)
            : prev.activity,
      }));
      await api.setRecommendationStatus(id, status);
      toast({
        tone: status === "completed" ? "success" : "info",
        title:
          status === "completed"
            ? "Marked as completed"
            : status === "dismissed"
              ? "Recommendation dismissed"
              : "Recommendation reopened",
        description: rec?.title,
      });
    },
    [patch, snapshot.recommendations, toast]
  );

  const updateSettings = useCallback<StoreValue["updateSettings"]>(
    async (next) => {
      const merged = { ...snapshot.settings, ...next };
      patch((prev) => ({ ...prev, settings: merged }));
      await api.saveSettings(merged);
      toast({ tone: "success", title: "Preferences saved", description: "Stored locally for this demo." });
    },
    [patch, snapshot.settings, toast]
  );

  const updateProfile = useCallback<StoreValue["updateProfile"]>(
    async (next) => {
      patch((prev) => ({ ...prev, user: { ...prev.user, ...next } }));
      await new Promise((r) => setTimeout(r, 260));
      toast({ tone: "success", title: "Profile updated", description: next.fullName ?? undefined });
    },
    [patch, toast]
  );

  const refreshForecasts = useCallback<StoreValue["refreshForecasts"]>(
    (scope) => {
      pushActivity({
        id: newActivityId(),
        type: "forecast-refreshed",
        message: scope
          ? `Forecast refreshed · ${scope}`
          : `All estimates refreshed across ${snapshot.farms.length} farm${
              snapshot.farms.length === 1 ? "" : "s"
            }`,
        at: new Date().toISOString(),
      });
      toast({
        tone: "info",
        title: "Estimates refreshed",
        description:
          "Recomputed from the recorded planting dates, reference durations and demo weather.",
      });
    },
    [pushActivity, snapshot.farms.length, toast]
  );

  const resetDemoData = useCallback(async () => {
    const fresh = await api.resetDemoData();
    hydrated.current = true;
    setSnapshot({ ...fresh, signedIn: true, onboarded: snapshot.onboarded });
    setSelectedFarmId(fresh.settings.defaultFarmId ?? fresh.farms[0]?.id ?? ALL_FARMS);
    setReadNotificationIds([]);
    toast({
      tone: "warning",
      title: "Demo data reset",
      description: "Farms, crops and recommendations are back to the sample dataset.",
    });
  }, [snapshot.onboarded, toast]);

  const markNotificationsRead = useCallback(() => {
    setReadNotificationIds(notifications.map((n) => n.id));
  }, [notifications]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      loadError,
      retryLoad: () => void load(),
      signedIn: snapshot.signedIn,
      user: snapshot.user,
      onboarded: snapshot.onboarded,
      showOnboarding,
      setShowOnboarding,
      farms: snapshot.farms,
      crops: snapshot.crops,
      recommendations: snapshot.recommendations,
      activity: snapshot.activity,
      settings: snapshot.settings,
      weather: intelligence.weather,
      forecasts: intelligence.forecasts,
      notifications,
      unreadCount,
      selectedFarmId,
      selectFarm: (id) => setSelectedFarmId(id),
      signIn,
      startDemoSession,
      signUp,
      signOut,
      completeOnboarding,
      addFarm,
      updateFarm,
      deleteFarm,
      fetchFarm,
      refreshFarms,
      addCrop,
      updateCrop,
      removeCrop,
      fetchCrop,
      refreshCrops,
      setRecommendationStatus,
      updateSettings,
      updateProfile,
      refreshForecasts,
      resetDemoData,
      markNotificationsRead,
    }),
    [
      ready,
      loadError,
      load,
      snapshot,
      showOnboarding,
      intelligence,
      notifications,
      unreadCount,
      selectedFarmId,
      signIn,
      startDemoSession,
      signUp,
      signOut,
      completeOnboarding,
      addFarm,
      updateFarm,
      deleteFarm,
      fetchFarm,
      refreshFarms,
      addCrop,
      updateCrop,
      removeCrop,
      fetchCrop,
      refreshCrops,
      setRecommendationStatus,
      updateSettings,
      refreshForecasts,
      resetDemoData,
      markNotificationsRead,
      updateProfile,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <AppStoreProvider>");
  return ctx;
}

/* ----------------------------------------------------------- selectors */

export function useSelectedFarm(): Farm | null {
  const { farms, selectedFarmId } = useStore();
  if (selectedFarmId === ALL_FARMS) return null;
  return farms.find((f) => f.id === selectedFarmId) ?? null;
}

export function useVisibleCrops(): Crop[] {
  const { crops, selectedFarmId } = useStore();
  if (selectedFarmId === ALL_FARMS) return crops;
  return crops.filter((c) => c.farmId === selectedFarmId);
}

export function useCrop(cropId?: string): Crop | null {
  const { crops } = useStore();
  if (!cropId) return null;
  return crops.find((c) => c.id === cropId) ?? null;
}

export function useFarm(farmId?: string): Farm | null {
  const { farms } = useStore();
  if (!farmId) return null;
  return farms.find((f) => f.id === farmId) ?? null;
}

export function useForecast(cropId?: string): Forecast | null {
  const { forecasts } = useStore();
  if (!cropId) return null;
  return forecasts[cropId] ?? null;
}

export function useWeatherForFarm(farmId?: string | null): WeatherSummary | null {
  const { weather } = useStore();
  if (!farmId) return null;
  return weather[farmId] ?? null;
}
