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
  API_CONFIG,
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
import {
  buildEmptySnapshot,
  buildSeedSnapshot,
  localStore,
  type PersistedSnapshot,
} from "@/services/storage/localStore";
import { DEFAULT_SETTINGS, DEMO_CREDENTIALS, DEMO_USER } from "@/data/mock/seed";
import { setLocale } from "@/utils/date";
import { useToast } from "@/components/feedback/ToastProvider";
import { authClient, type AuthUser } from "@/services/api/authClient";
import { openMeteoWeatherProvider } from "@/services/weather/openMeteoProvider";

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
  village?: string;
  pincode?: string;
  soilType?: string;
  irrigationSource?: string;
  latitude?: number | null;
  longitude?: number | null;
  area: number;
  areaUnit: Farm["areaUnit"];
  notes?: string;
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
  weatherLoading: boolean;
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
  dismissOnboarding: () => void;
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
  refreshRecommendations: (farmId?: string) => Promise<void>;
  setRecommendationStatus: (id: string, status: RecommendationStatus) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  refreshingForecasts: boolean;
  refreshForecasts: (scope?: string, farmId?: string, cropId?: string) => Promise<void> | void;
  fetchFarmWeather: (farmId: string, forceRefresh?: boolean) => Promise<WeatherSummary | null>;
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
  const [serverNotifications, setServerNotifications] = useState<AppNotification[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [serverForecasts, setServerForecasts] = useState<Record<string, Forecast>>({});
  const [refreshingForecasts, setRefreshingForecasts] = useState(false);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    setReady(false);
    setLoadError(null);
    try {
      // 1. Restore authentication from server state rather than trusting local storage
      let authUser: AuthUser | null = null;
      try {
        const authResult = await authClient.getMe();
        if (authResult?.user) {
          authUser = authResult.user;
        }
      } catch {
        // No active or valid session exists on server
      }

      // 2. Fetch snapshot scoped to identified user (or demo key if unauthenticated)
      const data = await api.loadSnapshot(authUser?.email || null);

      if (authUser) {
        data.signedIn = true;
        data.user = {
          fullName: authUser.name,
          email: authUser.email,
          role: authUser.role,
          organisation:
            data.user?.organisation ||
            (authUser.role === "SELLER" ? "Merchant / Trading" : "HarvestWindow Farm"),
        };
      } else {
        data.signedIn = false;
      }

      setSnapshot(data);
      hydrated.current = true;
      const validSelectedFarm = data.farms.some((f) => f.id === data.settings?.defaultFarmId)
        ? data.settings.defaultFarmId!
        : (data.farms[0]?.id ?? ALL_FARMS);
      setSelectedFarmId(validSelectedFarm);

      // 3. In live API mode, pull live harvest predictions from prediction engine
      if (API_CONFIG.mode === "live") {
        try {
          const list = await api.listForecasts();
          if (Array.isArray(list) && list.length > 0) {
            const map: Record<string, Forecast> = {};
            for (const f of list) {
              map[f.cropId] = f;
            }
            setServerForecasts(map);
          }
        } catch (fcErr) {
          console.warn("[HarvestWindow API] Unable to fetch live forecasts during snapshot load:", fcErr);
        }

        // 4. Pull live persistent activities and notifications for authenticated user
        if (authUser) {
          try {
            const [liveAct, liveNotifs, unread] = await Promise.all([
              api.listActivities({ limit: 40 }),
              api.listNotifications({ limit: 20 }),
              api.getUnreadNotificationCount(),
            ]);
            if (Array.isArray(liveAct) && liveAct.length > 0) {
              data.activity = liveAct;
            }
            if (Array.isArray(liveNotifs) && liveNotifs.length > 0) {
              setServerNotifications(
                liveNotifs.map((n) => ({
                  id: n.id,
                  title: n.title,
                  body: n.body || n.message || "",
                  at: n.at,
                  kind: (n.kind as any) || "activity",
                  farmId: n.farmId,
                  cropId: n.cropId,
                }))
              );
            }
            setServerUnreadCount(unread);
          } catch (actErr) {
            console.warn("[HarvestWindow API] Unable to fetch live activities/notifications:", actErr);
          }
        }
      }

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

  // Persist the snapshot locally under user-scoped storage key
  useEffect(() => {
    if (!hydrated.current) return;
    localStore.save(snapshot, snapshot.signedIn ? snapshot.user?.email : null);
  }, [snapshot]);

  // Language preference drives date/number formatting across the workspace.
  useEffect(() => {
    setLocale(snapshot.settings.language);
  }, [snapshot.settings.language]);

  // Guard selectedFarmId: if it points to a non-existent farm, fall back to first farm or ALL_FARMS
  useEffect(() => {
    if (!ready) return;
    if (selectedFarmId === ALL_FARMS) return;
    const exists = snapshot.farms.some((f) => f.id === selectedFarmId);
    if (!exists) {
      setSelectedFarmId(snapshot.farms[0]?.id ?? ALL_FARMS);
    }
  }, [ready, selectedFarmId, snapshot.farms]);

  const patch = useCallback(
    (updater: (prev: PersistedSnapshot) => PersistedSnapshot) =>
      setSnapshot((prev) => updater(prev)),
    []
  );

  const [liveWeather, setLiveWeather] = useState<Record<string, WeatherSummary>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);

  const intelligence = useMemo(
    () => buildIntelligence(snapshot.farms, snapshot.crops, serverForecasts),
    [snapshot.farms, snapshot.crops, serverForecasts]
  );

  const mergedWeather = useMemo(() => {
    return { ...intelligence.weather, ...liveWeather };
  }, [intelligence.weather, liveWeather]);

  const notifications = useMemo<AppNotification[]>(() => {
    if (serverNotifications.length > 0) {
      return serverNotifications;
    }

    const out: AppNotification[] = [];

    for (const farm of snapshot.farms) {
      const weather = mergedWeather[farm.id];
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
  }, [serverNotifications, snapshot.farms, snapshot.activity, mergedWeather]);

  const unreadCount = useMemo(() => {
    if (serverUnreadCount !== null) {
      return serverUnreadCount;
    }
    return notifications.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [serverUnreadCount, notifications, readNotificationIds]);

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

        const isDemo = normalized === DEMO_CREDENTIALS.email;
        const userSnapshot =
          localStore.load(result.user.email) ??
          (isDemo ? buildSeedSnapshot() : buildEmptySnapshot({ email: result.user.email }));

        let liveFarms = userSnapshot.farms;
        try {
          const fetched = await api.listFarms();
          if (Array.isArray(fetched)) {
            liveFarms = fetched;
          }
        } catch (fetchErr) {
          console.warn("[AppStore] Could not fetch live farms on sign-in:", fetchErr);
        }

        const farmIdSet = new Set(liveFarms.map((f) => f.id));
        const validCrops = isDemo
          ? userSnapshot.crops
          : userSnapshot.crops.filter((c) => farmIdSet.has(c.farmId));

        let liveRecs: Recommendation[] = [];
        try {
          const recRes = await api.listRecommendations({ limit: 100 });
          if (recRes && Array.isArray(recRes.items)) {
            liveRecs = recRes.items;
          }
          if (!isDemo && validCrops.length > 0 && liveRecs.length === 0) {
            try {
              await api.refreshRecommendations();
              const refreshed = await api.listRecommendations({ limit: 100 });
              if (refreshed && Array.isArray(refreshed.items)) {
                liveRecs = refreshed.items;
              }
            } catch {
              /* ignore auto-refresh error */
            }
          }
        } catch (recErr) {
          console.warn("[AppStore] Could not fetch live recommendations on sign-in:", recErr);
        }

        const validRecs =
          Array.isArray(liveRecs) && liveRecs.length > 0
            ? liveRecs
            : isDemo
              ? userSnapshot.recommendations
              : userSnapshot.recommendations.filter((r) => farmIdSet.has(r.farmId));

        let liveAct: ActivityEvent[] = [];
        if (!isDemo && API_CONFIG.mode === "live") {
          try {
            void api.syncAlerts().catch(() => {});
            const [acts, notifs, unread] = await Promise.all([
              api.listActivities({ limit: 40 }),
              api.listNotifications({ limit: 20 }),
              api.getUnreadNotificationCount(),
            ]);
            if (Array.isArray(acts) && acts.length > 0) {
              liveAct = acts;
            }
            if (Array.isArray(notifs) && notifs.length > 0) {
              setServerNotifications(
                notifs.map((n) => ({
                  id: n.id,
                  title: n.title,
                  body: n.body || n.message || "",
                  at: n.at,
                  kind: (n.kind as any) || "activity",
                  farmId: n.farmId,
                  cropId: n.cropId,
                }))
              );
            }
            setServerUnreadCount(unread);
          } catch (actErr) {
            console.warn("[AppStore] Could not fetch live activities/notifications on sign-in:", actErr);
          }
        }

        const updatedSnapshot: PersistedSnapshot = {
          ...userSnapshot,
          farms: liveFarms,
          crops: validCrops,
          recommendations: validRecs,
          activity: liveAct.length > 0 ? liveAct : userSnapshot.activity,
          signedIn: true,
          user: {
            fullName: result.user.name,
            email: result.user.email,
            role: result.user.role,
            organisation:
              userSnapshot.user?.organisation ||
              (result.user.role === "SELLER" ? "Merchant / Trading" : "HarvestWindow Farm"),
          },
        };

        setSnapshot(updatedSnapshot);
        const validSelectedFarm = liveFarms.some((f) => f.id === updatedSnapshot.settings?.defaultFarmId)
          ? updatedSnapshot.settings.defaultFarmId!
          : (liveFarms[0]?.id ?? ALL_FARMS);
        setSelectedFarmId(validSelectedFarm);
        localStore.save(updatedSnapshot, result.user.email);
        return { ok: true };
      } catch (err: unknown) {
        // Fallback to demo credentials if offline or local demo
        if (normalized === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          const demoSnap = buildSeedSnapshot();
          demoSnap.signedIn = true;
          demoSnap.user = DEMO_USER;
          setSnapshot(demoSnap);
          setSelectedFarmId(demoSnap.settings?.defaultFarmId ?? demoSnap.farms[0]?.id ?? ALL_FARMS);
          localStore.save(demoSnap, DEMO_CREDENTIALS.email);
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
    []
  );

  const startDemoSession = useCallback(async () => {
    try {
      await authApi.startDemoSession();
    } catch {
      /* ignore offline */
    }
    const demoSnap = buildSeedSnapshot();
    demoSnap.signedIn = true;
    demoSnap.user = DEMO_USER;
    setSnapshot(demoSnap);
    setSelectedFarmId(demoSnap.settings?.defaultFarmId ?? demoSnap.farms[0]?.id ?? ALL_FARMS);
    localStore.save(demoSnap, DEMO_CREDENTIALS.email);
  }, []);

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

        // A newly registered user has 0 farms; query live server to ensure exact sync
        let liveFarms: Farm[] = [];
        try {
          const fetched = await api.listFarms();
          if (Array.isArray(fetched)) liveFarms = fetched;
        } catch {
          liveFarms = [];
        }

        const freshSnapshot: PersistedSnapshot = {
          version: 1,
          farms: liveFarms,
          crops: [],
          recommendations: [],
          activity: [],
          settings: structuredClone(DEFAULT_SETTINGS),
          user: {
            fullName: result.user.name,
            email: result.user.email,
            role: result.user.role,
            organisation: role === "SELLER" ? "Merchant / Trading" : "Independent Producer",
          },
          signedIn: true,
          onboarded: false,
        };

        setSnapshot(freshSnapshot);
        setSelectedFarmId(ALL_FARMS);
        localStore.save(freshSnapshot, result.user.email);
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
    []
  );

  const signOut = useCallback(() => {
    void authClient.logout();
    setAuthToken(null);
    setServerNotifications([]);
    setServerUnreadCount(null);
    const loggedOutSnap = buildSeedSnapshot();
    loggedOutSnap.signedIn = false;
    setSnapshot(loggedOutSnap);
    setSelectedFarmId(ALL_FARMS);
    setShowOnboarding(false);
  }, []);

  /* ------------------------------------------------------------ onboarding */

  const dismissOnboarding = useCallback(() => {
    patch((prev) => ({
      ...prev,
      onboarded: true,
    }));
    setShowOnboarding(false);
  }, [patch]);

  useEffect(() => {
    if (ready && snapshot.signedIn) {
      if (snapshot.farms && snapshot.farms.length > 0 && !snapshot.onboarded) {
        patch((prev) => ({ ...prev, onboarded: true }));
        return;
      }
      if (!snapshot.onboarded && !showOnboarding && (!snapshot.farms || snapshot.farms.length === 0)) {
        setShowOnboarding(true);
      }
    }
  }, [ready, snapshot.signedIn, snapshot.onboarded, snapshot.farms, showOnboarding, patch]);

  const completeOnboarding = useCallback<StoreValue["completeOnboarding"]>(
    async (draft) => {
      const { farm } = await api.createFarm({
        name: draft.farmName,
        state: draft.state,
        district: draft.district,
        villageOrTaluka: draft.village || undefined,
        village: draft.village || undefined,
        postalCode: draft.pincode || undefined,
        pincode: draft.pincode || undefined,
        soilType: draft.soilType || undefined,
        irrigationSource: draft.irrigationSource || undefined,
        latitude: draft.latitude !== undefined ? draft.latitude : null,
        longitude: draft.longitude !== undefined ? draft.longitude : null,
        area: draft.area,
        areaUnit: draft.areaUnit,
        notes: draft.notes || undefined,
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

      if (API_CONFIG.mode === "live") {
        void api.getForecast(crop.id).then((fc) => {
          if (fc) {
            setServerForecasts((prev) => ({ ...prev, [crop.id]: fc }));
          }
        }).catch(() => {});
      }

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

      if (API_CONFIG.mode === "live") {
        void api.getForecast(crop.id).then((fc) => {
          if (fc) {
            setServerForecasts((prev) => ({ ...prev, [crop.id]: fc }));
          }
        }).catch(() => {});
      }

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
        toast({ tone: "error", title: "Delete failed", description: msg });
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

  const refreshRecommendations = useCallback<StoreValue["refreshRecommendations"]>(
    async (farmId) => {
      try {
        await api.refreshRecommendations(farmId);
        const res = await api.listRecommendations(farmId ? { farmId, limit: 100 } : { limit: 100 });
        if (res && Array.isArray(res.items)) {
          patch((prev) => ({
            ...prev,
            recommendations: res.items,
            activity: [
              {
                id: newActivityId(),
                type: "recommendation-generated" as const,
                message: `Refreshed guidance: ${res.items.filter((r) => r.status === "open").length} open actions available`,
                at: new Date().toISOString(),
                farmId,
              },
              ...prev.activity,
            ].slice(0, 40),
          }));
          toast({
            tone: "success",
            title: "Recommendations updated",
            description: "Fresh guidance calculated based on current crops, weather, and farm data.",
          });
        }
      } catch (err) {
        console.error("[AppStore] Failed to refresh recommendations:", err);
        toast({
          tone: "caution",
          title: "Refresh failed",
          description: "Could not generate fresh recommendations from the server.",
        });
      }
    },
    [patch, toast]
  );

  const setRecommendationStatus = useCallback<StoreValue["setRecommendationStatus"]>(
    async (id, status) => {
      const rec = snapshot.recommendations.find((r) => r.id === id);
      const previousStatus = rec?.status;

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

      try {
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
      } catch (err) {
        if (previousStatus) {
          patch((prev) => ({
            ...prev,
            recommendations: prev.recommendations.map((r) =>
              r.id === id ? { ...r, status: previousStatus } : r
            ),
          }));
        }
        toast({
          tone: "caution",
          title: "Status update failed",
          description: "Could not update recommendation status on the server.",
        });
      }
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
    async (scope, farmId, cropId) => {
      setRefreshingForecasts(true);
      try {
        const result = await api.refreshForecasts({ farmId, cropId });
        if (result?.forecasts && result.forecasts.length > 0) {
          setServerForecasts((prev) => {
            const next = { ...prev };
            for (const f of result.forecasts) {
              next[f.cropId] = f;
            }
            return next;
          });
        }
        pushActivity({
          id: newActivityId(),
          type: "forecast-refreshed",
          message: scope
            ? `Forecast refreshed · ${scope}`
            : `All estimates refreshed across ${snapshot.farms.length} farm${
                snapshot.farms.length === 1 ? "" : "s"
              }`,
          at: new Date().toISOString(),
          farmId,
          cropId,
        });
        toast({
          tone: "info",
          title: "Estimates refreshed",
          description: `Updated ${result.updated} harvest forecast${
            result.updated === 1 ? "" : "s"
          } from prediction engine.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to refresh forecasts";
        toast({ tone: "error", title: "Refresh failed", description: msg });
      } finally {
        setRefreshingForecasts(false);
      }
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

  const fetchFarmWeather = useCallback<StoreValue["fetchFarmWeather"]>(
    async (farmId, forceRefresh = false) => {
      const farm = snapshot.farms.find((f) => f.id === farmId);
      if (!farm) return null;
      setWeatherLoading(true);
      try {
        const summary = await openMeteoWeatherProvider.fetchForFarm(farm, forceRefresh);
        setLiveWeather((prev) => ({ ...prev, [farmId]: summary }));
        return summary;
      } catch (err) {
        console.warn(`[AppStore] fetchFarmWeather failed for ${farmId}:`, err);
        return null;
      } finally {
        setWeatherLoading(false);
      }
    },
    [snapshot.farms]
  );

  useEffect(() => {
    if (ready && snapshot.signedIn && snapshot.farms.length > 0) {
      const targetId =
        selectedFarmId && selectedFarmId !== ALL_FARMS
          ? selectedFarmId
          : snapshot.farms[0]?.id;
      const targetFarm = snapshot.farms.find((f) => f.id === targetId);
      if (
        targetFarm &&
        targetFarm.latitude !== null &&
        targetFarm.longitude !== null &&
        targetFarm.latitude !== undefined &&
        targetFarm.longitude !== undefined &&
        !liveWeather[targetFarm.id]
      ) {
        void fetchFarmWeather(targetFarm.id);
      }
    }
  }, [ready, snapshot.signedIn, selectedFarmId, snapshot.farms, liveWeather, fetchFarmWeather]);

  const markNotificationsRead = useCallback(() => {
    setReadNotificationIds(notifications.map((n) => n.id));
    setServerUnreadCount(0);
    if (API_CONFIG.mode === "live") {
      void api.markAllNotificationsRead().catch(() => {});
    }
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
      weather: mergedWeather,
      weatherLoading,
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
      dismissOnboarding,
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
      refreshRecommendations,
      setRecommendationStatus,
      updateSettings,
      updateProfile,
      refreshingForecasts,
      refreshForecasts,
      fetchFarmWeather,
      resetDemoData,
      markNotificationsRead,
    }),
    [
      ready,
      loadError,
      load,
      snapshot,
      showOnboarding,
      mergedWeather,
      weatherLoading,
      intelligence,
      notifications,
      unreadCount,
      selectedFarmId,
      signIn,
      startDemoSession,
      signUp,
      signOut,
      completeOnboarding,
      dismissOnboarding,
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
      refreshRecommendations,
      setRecommendationStatus,
      updateSettings,
      refreshingForecasts,
      refreshForecasts,
      fetchFarmWeather,
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
