import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CloudRain,
  Droplets,
  Layers,
  MapPin,
  Plus,
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
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { CONDITION_LABEL } from "@/services/weather/weatherService";
import { formatDate, relativeTime } from "@/utils/date";
import { cn } from "@/utils/cn";

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
    user,
    selectedFarmId,
    selectFarm,
    onboarded,
    setShowOnboarding,
    setRecommendationStatus,
  } = useStore();

  const metrics = useDashboardMetrics();
  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        variant="hero"
        aside={
          metrics.nextHarvest ? (
            <button
              type="button"
              onClick={() => navigate(`/app/crops/${metrics.nextHarvest!.crop.id}`)}
              className="hw-hud flex items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-left transition-colors hover:border-gold/50"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/20 text-gold">
                <Sprout className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[10px] tracking-wide text-sage/70 uppercase">Next harvest</span>
                <span className="block font-display text-[12.5px] font-semibold text-cream">
                  {metrics.nextHarvest.crop.name} · {formatDate(metrics.nextHarvest.forecast.estimatedWindowStart)}
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
            : `${activeFarm?.district}, ${activeFarm?.state} · ${activeFarm?.area} ${
                activeFarm?.areaUnit === "hectare" ? "hectares" : "acres"
              }`
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

      {/* Key intelligence indicators */}
      <section aria-label="Key indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricPanel
          label="Active fields"
          value={metrics.activeFields}
          icon={<Layers className="h-4 w-4" aria-hidden />}
          tone="forest"
          delay={0}
          context={`${crops.length} crop records tracked across ${farms.length} farm${
            farms.length === 1 ? "" : "s"
          }.`}
          onClick={() => navigate("/app/farms")}
        />
        <MetricPanel
          label="Approaching window"
          value={metrics.approaching + metrics.inWindow}
          icon={<CalendarRange className="h-4 w-4" aria-hidden />}
          tone="gold"
          delay={0.06}
          context={`${metrics.inWindow} open now · ${metrics.approaching} opening within three weeks.`}
          onClick={() => navigate("/app/forecast")}
        />
        <MetricPanel
          label="Needs attention"
          value={metrics.attention}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
          tone="caution"
          delay={0.12}
          context={
            metrics.attention === 0
              ? "Nothing flagged right now."
              : "Weather caution or a window that has already closed."
          }
          onClick={() => navigate("/app/recommendations")}
        />
        <MetricPanel
          label="Next estimated harvest"
          value={
            metrics.nextHarvest
              ? `${metrics.nextHarvest.crop.name.split(" ")[0]}`
              : "—"
          }
          icon={<Sprout className="h-4 w-4" aria-hidden />}
          tone="earth"
          delay={0.18}
          context={
            metrics.nextHarvest
              ? `${formatDate(metrics.nextHarvest.forecast.estimatedWindowStart)} · ${
                  metrics.nextHarvest.farmName
                }`
              : "No upcoming window in this selection."
          }
          onClick={() =>
            metrics.nextHarvest && navigate(`/app/crops/${metrics.nextHarvest.crop.id}`)
          }
          footer={
            metrics.nextHarvest ? (
              <StatusBadge status={metrics.nextHarvest.forecast.readinessStatus} />
            ) : undefined
          }
        />
      </section>

      {/* Signature harvest window */}
      <section
        aria-label="Harvest window"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
      >
        <Card className="overflow-hidden">
          <CardHeader
            title="Harvest window"
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

        {/* Weather strip */}
        <Card className="flex flex-col">
          <CardHeader
            title="Weather context"
            subtitle={activeWeather?.locationLabel ?? "Select a farm"}
            icon={<CloudRain className="h-4 w-4" aria-hidden />}
            action={
              <Link
                to="/app/weather"
                className="text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
              >
                Open
              </Link>
            }
          />
          {activeWeather ? (
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-end justify-between gap-4">
                <p className="hw-num text-[42px] leading-none font-extrabold text-forest-deep">
                  {activeWeather.temperatureC}°
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
                  { icon: Thermometer, label: "Feels like", value: `${activeWeather.feelsLikeC}°` },
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

              <p className="mt-auto pt-4 font-mono text-[10px] tracking-wide text-muted uppercase">
                {activeWeather.sourceLabel} · demo dataset
              </p>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<CloudRain className="h-5 w-5" aria-hidden />}
                title="No farm selected"
                description="Choose a farm to see the weather context attached to its crops."
              />
            </div>
          )}
        </Card>
      </section>

      {/* Crop overview */}
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

      {/* Activity + recommendations */}
      <section aria-label="Activity and actions" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader
            title="Recent activity"
            subtitle="Mock events from this demo workspace — updated as you work."
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
          />
          <div className="p-5">
            <ActivityFeed events={activity} limit={6} />
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
