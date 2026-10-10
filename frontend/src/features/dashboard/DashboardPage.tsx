import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock,
  CloudRain,
  Droplets,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Sprout,
  Thermometer,
  Wind,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, Button, EmptyState, StatusBadge, buttonStyles } from "@/components/common/ui";
import { MetricPanel } from "@/features/common/MetricPanel";
import { CropCard } from "@/features/crops/CropCard";
import { ActivityFeed } from "@/features/common/ActivityFeed";
import { RecommendationCard } from "@/features/recommendations/RecommendationCard";
import { HarvestTimeline } from "@/components/charts/HarvestTimeline";
import { CropImage } from "@/components/common/CropImage";
import { CROP_IMAGES } from "@/data/mock/cropCatalog";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import { api, type DashboardData } from "@/services/api";
import { CONDITION_LABEL } from "@/services/weather/weatherService";
import { formatDate, relativeTime } from "@/utils/date";
import { formatArea, formatTemperature } from "@/utils/units";
import { cn } from "@/utils/cn";
import { CropStatusChart } from "./CropStatusChart";

type Filter = "all" | "approaching" | "in-window" | "attention";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All crops" },
  { id: "approaching", label: "Approaching" },
  { id: "in-window", label: "In window" },
  { id: "attention", label: "Needs attention" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { openAddCrop } = useOutletContext<{ openAddCrop: () => void }>();
  const navigate = useNavigate();
  const {
    farms,
    crops,
    forecasts,
    weather,
    recommendations,
    activity,
    settings,
    user,
    selectedFarmId,
    selectFarm,
    onboarded,
    setShowOnboarding,
    setRecommendationStatus,
    refreshForecasts,
    refreshingForecasts,
  } = useStore();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err: unknown) {
      console.warn("[DashboardPage] Failed to fetch backend dashboard:", err);
      setDashboardError(err instanceof Error ? err.message : "Unable to load dashboard data");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard, crops.length, farms.length]);

  const handleRefreshAll = async () => {
    await refreshForecasts();
    await fetchDashboard();
  };

  const visibleCrops = useMemo(
    () => (selectedFarmId === ALL_FARMS ? crops : crops.filter((c) => c.farmId === selectedFarmId)),
    [crops, selectedFarmId]
  );

  const activeFarm = farms.find((f) => f.id === selectedFarmId) ?? null;

  // Keep the timeline on a crop that belongs to the selected farm.
  useEffect(() => {
    if (visibleCrops.length === 0) {
      setActiveCropId(null);
      return;
    }
    if (!activeCropId || !visibleCrops.some((c) => c.id === activeCropId)) {
      const priority =
        visibleCrops.find((c) => forecasts[c.id]?.readinessStatus === "in-window") ??
        visibleCrops.find((c) => forecasts[c.id]?.readinessStatus === "caution") ??
        visibleCrops.find((c) => forecasts[c.id]?.readinessStatus === "approaching") ??
        visibleCrops[0];
      setActiveCropId(priority.id);
    }
  }, [visibleCrops, activeCropId, forecasts]);

  const activeCrop = visibleCrops.find((c) => c.id === activeCropId) ?? null;
  const activeForecast = activeCrop ? forecasts[activeCrop.id] : null;
  const activeWeather = activeCrop ? weather[activeCrop.farmId] : null;

  const filteredCrops = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleCrops.filter((crop) => {
      const forecast = forecasts[crop.id];
      if (!forecast) return false;
      if (q) {
        const farmName = farms.find((f) => f.id === crop.farmId)?.name ?? "";
        if (!`${crop.name} ${crop.variety ?? ""} ${farmName}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filter === "all") return true;
      if (filter === "approaching") return forecast.readinessStatus === "approaching";
      if (filter === "in-window") return forecast.readinessStatus === "in-window";
      return forecast.readinessStatus === "caution" || forecast.readinessStatus === "passed";
    });
  }, [visibleCrops, forecasts, farms, filter, query]);

  const openRecommendations = useMemo(
    () =>
      recommendations
        .filter((r) => r.status === "open")
        .filter((r) => selectedFarmId === ALL_FARMS || r.farmId === selectedFarmId)
        .sort((a, b) => {
          const rank = { high: 0, medium: 1, low: 2 } as const;
          return rank[a.priority] - rank[b.priority];
        })
        .slice(0, 2),
    [recommendations, selectedFarmId]
  );

  const lastUpdated = useMemo(() => {
    const stamps = Object.values(forecasts).map((f) => f.updatedAt);
    if (stamps.length === 0) return null;
    return stamps.reduce((a, b) => (a > b ? a : b));
  }, [forecasts]);

  // Derived or authoritative backend statistics
  const overviewStats = useMemo(() => {
    if (dashboardData?.overview) {
      return {
        totalFarms: dashboardData.overview.totalFarms,
        totalTrackedArea: dashboardData.overview.totalTrackedArea,
        totalActiveCrops: dashboardData.overview.totalActiveCrops,
        approachingHarvest: dashboardData.overview.approachingHarvest,
        readyForHarvest: dashboardData.overview.readyForHarvest,
        overdueHarvests: dashboardData.overview.overdueHarvests,
      };
    }
    // Fallback if backend dashboard data is still loading
    return {
      totalFarms: farms.length,
      totalTrackedArea: farms.reduce((acc, f) => acc + (f.area || 0), 0),
      totalActiveCrops: crops.filter((c) => c.growthStage !== "HARVESTED").length,
      approachingHarvest: Object.values(forecasts).filter((f) => f.readinessStatus === "approaching").length,
      readyForHarvest: Object.values(forecasts).filter((f) => f.readinessStatus === "in-window").length,
      overdueHarvests: 0,
    };
  }, [dashboardData, farms, crops, forecasts]);

  const upcomingHarvestsList = useMemo(() => {
    if (dashboardData?.upcomingHarvests && dashboardData.upcomingHarvests.length > 0) {
      if (selectedFarmId === ALL_FARMS) return dashboardData.upcomingHarvests;
      return dashboardData.upcomingHarvests.filter((h) => h.farmId === selectedFarmId);
    }
    return [];
  }, [dashboardData, selectedFarmId]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        variant="hero"
        aside={
          upcomingHarvestsList[0] ? (
            <button
              type="button"
              onClick={() => navigate(`/app/crops/${upcomingHarvestsList[0].cropId}`)}
              className="hw-hud flex items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-left transition-colors hover:border-gold/50"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/20 text-gold">
                <Sprout className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[10px] tracking-wide text-sage/70 uppercase">Next harvest</span>
                <span className="block font-display text-[12.5px] font-semibold text-cream">
                  {upcomingHarvestsList[0].cropName} · {(upcomingHarvestsList[0].harvestWindow?.startDate || upcomingHarvestsList[0].estimatedWindowStart) ? formatDate(upcomingHarvestsList[0].harvestWindow?.startDate || upcomingHarvestsList[0].estimatedWindowStart!) : "Pending"}
                </span>
              </span>
            </button>
          ) : null
        }
        eyebrow={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        title={
          selectedFarmId === ALL_FARMS
            ? "Portfolio overview"
            : (activeFarm?.name ?? "Your farm")
        }
        subtitle={
          selectedFarmId === ALL_FARMS
            ? "Every farm in the plan, with the blocks closest to their estimated harvest window first."
            : `${activeFarm?.district}, ${activeFarm?.state} · ${formatArea(
                activeFarm?.area ?? 0,
                activeFarm?.areaUnit ?? "hectare",
                settings.areaUnit
              )}`
        }
        meta={[
          {
            icon: <MapPin className="h-3.5 w-3.5" aria-hidden />,
            label: "Farm",
            value: (
              <select
                aria-label="Select farm"
                value={selectedFarmId}
                onChange={(e) => selectFarm(e.target.value)}
                className="rounded-sm border border-line bg-white px-2 py-1 font-display text-[12.5px] font-semibold text-forest-deep outline-none focus:border-forest"
              >
                <option value={ALL_FARMS}>All farms</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ),
          },
          {
            icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
            label: "Today",
            value: formatDate(new Date()),
          },
          {
            label: "Estimates updated",
            value: lastUpdated ? relativeTime(lastUpdated) : "—",
          },
        ]}
        actions={
          <>
            <Button
              variant="inverse"
              size="sm"
              className="rounded-full bg-white/10 text-cream border-white/20 hover:bg-white/15"
              onClick={handleRefreshAll}
              loading={refreshingForecasts || loadingDashboard}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
            <Button
              variant="inverse"
              size="sm"
              className="rounded-full bg-white/10 text-cream border-white/20 hover:bg-white/15"
              onClick={() => navigate("/app/farms")}
            >
              <Layers className="h-4 w-4" aria-hidden />
              Farms
            </Button>
            <Button size="sm" variant="gold" className="hw-shine rounded-full" onClick={openAddCrop}>
              <Plus className="h-4 w-4" aria-hidden />
              Add crop
            </Button>
          </>
        }
      />

      {dashboardError && (
        <div className="flex items-center justify-between rounded-md border border-caution/40 bg-caution/10 p-4 text-[13px] text-forest-deep">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-caution shrink-0" />
            <span>Could not load the latest live dashboard metrics: {dashboardError}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      )}

      {!onboarded && (
        <div className="flex flex-col gap-3 rounded-md border border-gold/50 bg-gold-soft/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6415]" aria-hidden />
            <div>
              <p className="font-display text-[13.5px] font-bold text-forest-deep">
                Set up your own block in three steps
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Add a farm and a crop, and watch the first harvest window build.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowOnboarding(true)}>
              Start quick setup
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate("/how-it-works")}>
              Read the method
            </Button>
          </div>
        </div>
      )}

      {/* A. Key Overview Statistics (Authoritative Backend Data) */}
      <section aria-label="Key indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricPanel
          label="Tracked farms"
          value={overviewStats.totalFarms}
          icon={<Layers className="h-4 w-4" aria-hidden />}
          tone="forest"
          delay={0}
          context={`${overviewStats.totalFarms} farm${overviewStats.totalFarms === 1 ? "" : "s"} registered.`}
          onClick={() => navigate("/app/farms")}
        />
        <MetricPanel
          label="Total tracked area"
          value={formatArea(overviewStats.totalTrackedArea, "hectare", settings.areaUnit)}
          icon={<MapPin className="h-4 w-4" aria-hidden />}
          tone="forest"
          delay={0.04}
          context={`Converted to your preferred ${settings.areaUnit}s.`}
          onClick={() => navigate("/app/farms")}
        />
        <MetricPanel
          label="Active crops"
          value={overviewStats.totalActiveCrops}
          icon={<Sprout className="h-4 w-4" aria-hidden />}
          tone="living"
          delay={0.08}
          context={`${overviewStats.totalActiveCrops} growing blocks in the field.`}
          onClick={() => navigate("/app")}
        />
        <MetricPanel
          label="Approaching harvest"
          value={overviewStats.approachingHarvest}
          icon={<CalendarRange className="h-4 w-4" aria-hidden />}
          tone="gold"
          delay={0.12}
          context="Opening in the next 14 to 21 days."
          onClick={() => navigate("/app/forecast")}
        />
        <MetricPanel
          label="Ready for harvest"
          value={overviewStats.readyForHarvest}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          tone="caution"
          delay={0.16}
          context="Currently inside optimal harvest window."
          onClick={() => navigate("/app/forecast")}
        />
      </section>

      {/* B. Upcoming Harvest Opportunities Section */}
      <section aria-label="Upcoming harvest opportunities">
        <Card>
          <CardHeader
            title="Next predicted harvest opportunities"
            subtitle="Chronologically ordered by estimated harvest readiness window."
            icon={<Clock className="h-4 w-4" aria-hidden />}
            action={
              <Link
                to="/app/forecast"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
              >
                View all in forecast workspace
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <div className="p-5">
            {upcomingHarvestsList.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingHarvestsList.slice(0, 6).map((harvest) => (
                  <div
                    key={harvest.cropId}
                    onClick={() => navigate(`/app/crops/${harvest.cropId}`)}
                    className="flex flex-col justify-between rounded-md border border-line bg-cream/40 p-4 transition-all duration-200 hover:border-living/60 hover:bg-cream/70 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-display text-[14.5px] font-bold text-forest-deep truncate">
                            {harvest.cropName}
                          </p>
                          {(harvest.variety || harvest.cropVariety) && (
                            <p className="font-mono text-[11px] text-muted truncate">
                              {harvest.variety || harvest.cropVariety}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={harvest.readinessStatus as any} />
                      </div>

                      <p className="mt-2 text-[12px] text-muted">
                        Farm: <span className="font-semibold text-forest-deep">{harvest.farmName}</span>
                      </p>

                      <div className="mt-3 flex items-baseline justify-between border-t border-line/60 pt-2 text-[12px]">
                        <span className="text-muted">Window:</span>
                        <span className="font-mono font-medium text-forest-deep">
                          {(harvest.harvestWindow?.startDate || harvest.estimatedWindowStart) ? formatDate(harvest.harvestWindow?.startDate || harvest.estimatedWindowStart!) : "—"}
                          {" → "}
                          {(harvest.harvestWindow?.endDate || harvest.estimatedWindowEnd) ? formatDate(harvest.harvestWindow?.endDate || harvest.estimatedWindowEnd!) : "—"}
                        </span>
                      </div>

                      {(() => {
                        const days = harvest.daysRemaining ?? harvest.daysToWindowStart ?? harvest.daysUntilHarvest;
                        if (days === null || days === undefined) return null;
                        return (
                          <div className="mt-1 flex items-baseline justify-between text-[12px]">
                            <span className="text-muted">Days remaining:</span>
                            <span className="font-bold text-forest-deep">
                              {days > 0
                                ? `${days} days`
                                : days === 0
                                ? "Window open today"
                                : `${Math.abs(days)} days ago`}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="mt-1 flex items-baseline justify-between text-[11.5px]">
                        <span className="text-muted">Confidence:</span>
                        <span className="font-mono font-semibold text-living">
                          {harvest.confidenceScore}%
                        </span>
                      </div>
                    </div>

                    {harvest.actionableAdvice && (
                      <p className="mt-3 rounded bg-white/70 p-2 text-[11.5px] leading-relaxed text-muted border border-line/40">
                        {harvest.actionableAdvice}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Sprout className="h-5 w-5" aria-hidden />}
                title="No upcoming harvests predicted yet"
                description="Add your crops with their sowing dates to calculate predicted harvest windows."
                action={
                  <Button size="sm" onClick={openAddCrop}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add crop
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </section>

      {/* C & D. Crop Status Distribution & Signature Harvest Window */}
      <section
        aria-label="Crop Analytics & Timeline"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)]"
      >
        {/* C. Crop Status Visualization (Chart) */}
        <Card>
          <CardHeader
            title="Crop growth stage distribution"
            subtitle="Current developmental distribution across active fields."
            icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          />
          <div className="p-5">
            <CropStatusChart
              distribution={dashboardData?.cropStatusDistribution ?? []}
              height={260}
            />
          </div>
        </Card>

        {/* D. Signature Harvest Window Timeline for Active Crop */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Harvest window focus"
            subtitle="The estimated range for the selected block, with today marked against it."
            icon={<CalendarRange className="h-4 w-4" aria-hidden />}
            action={
              <Link
                to="/app/forecast"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
              >
                Forecast workspace
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <div className="p-5">
            {activeCrop && activeForecast ? (
              <>
                <div className="hw-scroll-x mb-5 flex gap-2 overflow-x-auto pb-1">
                  {visibleCrops.map((crop) => (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => setActiveCropId(crop.id)}
                      aria-pressed={crop.id === activeCrop.id}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-200",
                        crop.id === activeCrop.id
                          ? "border-forest-deep bg-forest-deep text-cream"
                          : "border-line bg-white text-forest-deep hover:border-living"
                      )}
                    >
                      <CropImage
                        src={CROP_IMAGES[crop.name]}
                        alt=""
                        cropName={crop.name}
                        className="h-5 w-5 rounded-full"
                      />
                      {crop.name}
                      {crop.variety ? (
                        <span className="font-mono text-[10.5px] opacity-70">{crop.variety}</span>
                      ) : null}
                    </button>
                  ))}
                </div>

                <HarvestTimeline
                  forecast={activeForecast}
                  crop={activeCrop}
                  farmName={activeFarm?.name ?? farms.find((f) => f.id === activeCrop.farmId)?.name}
                  detailed
                />

                <div className="mt-6 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <div className="rounded-md border border-line bg-cream/70 p-4">
                    <p className="hw-eyebrow font-semibold text-living">Recommended next action</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed font-medium text-forest-deep">
                      {activeForecast.nextAction}
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-cream/70 p-4">
                    <p className="hw-eyebrow font-semibold text-info">Weather note</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-forest-deep">
                      {activeForecast.weatherNote}
                    </p>
                    <p className="mt-1.5 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                      {activeWeather?.sourceLabel ?? "No weather dataset attached"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Sprout className="h-5 w-5" aria-hidden />}
                title="No crops in this selection yet"
                description="Add a crop with its planting date and HarvestWindow will build the first estimated harvest window here."
                action={
                  <Button size="sm" onClick={openAddCrop}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add crop
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </section>

      {/* Weather Strip Context */}
      <section aria-label="Weather context">
        <Card className="flex flex-col">
          <CardHeader
            title="Weather context"
            subtitle={activeWeather?.locationLabel ?? "Select a farm to inspect weather"}
            icon={<CloudRain className="h-4 w-4" aria-hidden />}
            action={
              <Link
                to="/app/weather"
                className="text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
              >
                Open weather view
              </Link>
            }
          />
          {activeWeather ? (
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-end justify-between gap-4">
                <p className="hw-num text-[42px] leading-none font-extrabold text-forest-deep">
                  {formatTemperature(activeWeather.temperatureC, settings.temperatureUnit)}
                </p>
                <div className="text-right">
                  <p className="font-display text-[13px] font-semibold text-forest-deep">
                    {CONDITION_LABEL[activeWeather.condition]}
                  </p>
                  <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">
                    Observed {relativeTime(activeWeather.observedAt)}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
                {[
                  { icon: Droplets, label: "Humidity", value: `${activeWeather.humidity}%` },
                  { icon: Wind, label: "Wind", value: `${activeWeather.windKph} km/h` },
                  {
                    icon: Thermometer,
                    label: "Feels like",
                    value: formatTemperature(activeWeather.feelsLikeC, settings.temperatureUnit),
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="flex items-center gap-1 text-[11px] text-muted">
                      <item.icon className="h-3 w-3" aria-hidden />
                      {item.label}
                    </dt>
                    <dd className="hw-num mt-1 text-[14px] font-bold text-forest-deep">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex items-end gap-1.5">
                {activeWeather.daily.slice(0, 10).map((d) => (
                  <span key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className={cn(
                        "w-full rounded-t-[2px]",
                        d.rainfallMm >= 15
                          ? "bg-info"
                          : d.rainfallMm > 0
                          ? "bg-info/50"
                          : "bg-line"
                      )}
                      style={{ height: Math.max(4, Math.min(40, d.rainfallMm * 1.5 + 4)) }}
                      title={`${d.date}: ${d.rainfallMm} mm`}
                    />
                    <span className="font-mono text-[9px] text-muted">
                      {new Date(d.date).toLocaleDateString("en-IN", { weekday: "narrow" })}
                    </span>
                  </span>
                ))}
              </div>

              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                {activeWeather.forecastSummary}
              </p>

              {activeWeather.cautions[0] && (
                <div className="mt-4 rounded-md border border-caution/35 bg-[#fdf6ec] p-3.5">
                  <p className="flex items-center gap-2 font-display text-[12.5px] font-bold text-forest-deep">
                    <AlertTriangle className="h-3.5 w-3.5 text-caution" aria-hidden />
                    {activeWeather.cautions[0].title}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6b5733]">
                    {activeWeather.cautions[0].detail}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<CloudRain className="h-5 w-5" aria-hidden />}
                title="No farm selected"
                description="Choose a farm to view the weather conditions attached to its crops."
              />
            </div>
          )}
        </Card>
      </section>

      {/* Crop Overview List */}
      <section aria-label="Crop overview">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-[19px] leading-tight font-bold text-forest-deep">
              Crop overview
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {filteredCrops.length} of {visibleCrops.length} blocks shown · readiness is an
              estimate from recorded inputs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    filter === f.id
                      ? "border-forest-deep bg-forest-deep text-cream"
                      : "border-line bg-white text-muted hover:border-living hover:text-forest-deep"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name…"
              aria-label="Filter crops by name"
              className="h-9 w-full rounded-sm border border-line bg-white px-3 text-[13px] outline-none focus:border-forest lg:w-44"
            />
          </div>
        </div>

        {filteredCrops.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCrops.map((crop, i) => (
              <CropCard
                key={crop.id}
                crop={crop}
                farm={farms.find((f) => f.id === crop.farmId)}
                forecast={forecasts[crop.id]}
                delay={Math.min(i * 0.05, 0.3)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sprout className="h-5 w-5" aria-hidden />}
            title={crops.length === 0 ? "No crops yet" : "Nothing matches this filter"}
            description={
              crops.length === 0
                ? "Add your first crop with a planting date to generate a harvest window."
                : "Try a different status filter, or clear the search field."
            }
            action={
              crops.length === 0 ? (
                <Button size="sm" onClick={openAddCrop}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add crop
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        )}
      </section>

      {/* Activity & Recommendations */}
      <section aria-label="Activity and actions" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader
            title="Recent activity"
            subtitle="Agricultural records and harvest estimate updates."
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
          />
          <div className="p-5">
            <ActivityFeed
              events={
                dashboardData?.recentActivity && dashboardData.recentActivity.length > 0
                  ? (dashboardData.recentActivity as any)
                  : activity
              }
              limit={6}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[19px] leading-tight font-bold text-forest-deep">
                Recommended actions
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Prioritised for the current selection. Suggestions, not prescriptions.
              </p>
            </div>
            <Link to="/app/recommendations" className={buttonStyles("secondary", "sm")}>
              All actions
            </Link>
          </div>

          {openRecommendations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {openRecommendations.map((rec, i) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  crop={crops.find((c) => c.id === rec.cropId)}
                  farm={farms.find((f) => f.id === rec.farmId)}
                  onStatus={(status) => void setRecommendationStatus(rec.id, status)}
                  delay={i * 0.06}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sprout className="h-5 w-5" aria-hidden />}
              title="Nothing to action right now"
              description="Recommendations appear when a window is approaching, weather interferes, or a record needs more detail."
            />
          )}
        </div>
      </section>
    </div>
  );
}
