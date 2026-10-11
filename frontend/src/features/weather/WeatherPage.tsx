import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarRange,
  CheckCircle2,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Info,
  LocateFixed,
  MapPin,
  Plug,
  RotateCw,
  Sprout,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
  CloudLightning,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/common/ui";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import { CONDITION_LABEL } from "@/services/weather/weatherService";
import { detectBrowserLocation } from "@/services/location/geolocationService";
import { formatDate, formatWeekday, relativeTime } from "@/utils/date";
import { formatArea, formatTemperature } from "@/utils/units";
import { cn } from "@/utils/cn";
import { api } from "@/services/api";
import type { FarmWeatherRiskSummary } from "@/types";

const CONDITION_ICON: Record<string, typeof Sun> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  overcast: CloudSun,
  rain: CloudRain,
  storm: TriangleAlert,
};

export default function WeatherPage() {
  const {
    farms,
    crops,
    forecasts,
    weather,
    weatherLoading,
    settings,
    selectedFarmId,
    selectFarm,
    fetchFarmWeather,
    updateFarm,
  } = useStore();
  const navigate = useNavigate();

  const [locatingFarm, setLocatingFarm] = useState(false);
  const [locateSuccess, setLocateSuccess] = useState<string | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);

  const activeFarm =
    farms.find((f) => f.id === selectedFarmId) ?? farms[0] ?? null;
  const summary = activeFarm ? weather[activeFarm.id] : null;

  const [farmRiskSummary, setFarmRiskSummary] = useState<FarmWeatherRiskSummary | null>(null);
  const [loadingFarmRisk, setLoadingFarmRisk] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (activeFarm?.id && activeFarm?.latitude && activeFarm?.longitude) {
      setLoadingFarmRisk(true);
      api
        .getFarmWeatherRisk(activeFarm.id)
        .then((data) => {
          if (active) setFarmRiskSummary(data);
        })
        .catch(() => {
          if (active) setFarmRiskSummary(null);
        })
        .finally(() => {
          if (active) setLoadingFarmRisk(false);
        });
    } else {
      setFarmRiskSummary(null);
    }
    return () => {
      active = false;
    };
  }, [activeFarm?.id, activeFarm?.latitude, activeFarm?.longitude]);

  const handleDetectAndSaveLocation = async () => {
    if (!activeFarm) return;
    setLocatingFarm(true);
    setLocateError(null);
    setLocateSuccess(null);
    try {
      const loc = await detectBrowserLocation();
      await updateFarm(activeFarm.id, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        state: loc.state || activeFarm.state,
        district: loc.district || activeFarm.district,
        village: loc.village || activeFarm.village,
        pincode: loc.pincode || activeFarm.pincode,
      });
      await fetchFarmWeather(activeFarm.id, true);
      setLocateSuccess(`Location locked: ${loc.latitude.toFixed(4)}°, ${loc.longitude.toFixed(4)}°. Live Open-Meteo feed connected!`);
    } catch (err: unknown) {
      setLocateError(
        err instanceof Error
          ? err.message
          : "Failed to detect live location. Please check browser permissions."
      );
    } finally {
      setLocatingFarm(false);
    }
  };

  const overlaps = useMemo(() => {
    if (!activeFarm || !summary || !Array.isArray(summary.daily)) return [];
    const wetDates = new Set(
      summary.daily.filter((d) => (d.rainfallMm || 0) >= 8).map((d) => d.date)
    );
    return (crops || [])
      .filter((c) => c && c.farmId === activeFarm.id)
      .map((crop) => {
        const forecast = forecasts?.[crop.id];
        if (!forecast || !forecast.estimatedWindowStart || !forecast.estimatedWindowEnd) return null;
        const inRange = [...wetDates].filter(
          (date) =>
            date >= forecast.estimatedWindowStart && date <= forecast.estimatedWindowEnd
        );
        const nearRange = [...wetDates].filter((date) => {
          const diff =
            (new Date(date).getTime() -
              new Date(forecast.estimatedWindowEnd).getTime()) /
            86_400_000;
          return diff > 0 && diff <= 7;
        });
        return { crop, forecast, inRange, nearRange };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && (x.inRange.length > 0 || x.nearRange.length > 0));
  }, [activeFarm, summary, crops, forecasts]);

  if (!activeFarm || !summary) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Weather intelligence" title="Weather context" />
        <EmptyState
          icon={<CloudRain className="h-5 w-5" aria-hidden />}
          title="No farm with a weather dataset"
          description="Add a farm with location context to view 10-day Open-Meteo forecasts and harvest cautions."
          action={
            <Button size="sm" onClick={() => navigate("/app/farms")}>
              Go to farms
            </Button>
          }
        />
      </div>
    );
  }

  const daily = Array.isArray(summary.daily) ? summary.daily : [];
  const cautions = Array.isArray(summary.cautions) ? summary.cautions : [];
  const Icon = CONDITION_ICON[summary.condition] ?? CloudSun;
  const totalRain = daily.reduce((s, d) => s + (d.rainfallMm || 0), 0);
  const avgMax = daily.length > 0
    ? Math.round(daily.reduce((s, d) => s + (d.maxTempC || 0), 0) / daily.length)
    : (summary.temperatureC || 28);

  const hasCoords =
    activeFarm.latitude !== null &&
    activeFarm.longitude !== null &&
    activeFarm.latitude !== undefined &&
    activeFarm.longitude !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Weather intelligence"
        title={`Weather context · ${summary.locationLabel}`}
        subtitle="Read against your harvest windows rather than as a standalone forecast. Wet days and temperature extremes that fall inside a window are called out per crop."
        meta={[
          {
            icon: <MapPin className="h-3.5 w-3.5" aria-hidden />,
            label: "Farm",
            value: (
              <select
                aria-label="Select farm for weather"
                value={selectedFarmId === ALL_FARMS ? activeFarm.id : selectedFarmId}
                onChange={(e) => {
                  selectFarm(e.target.value);
                  setLocateSuccess(null);
                  setLocateError(null);
                }}
                className="rounded-sm border border-line bg-white px-2 py-1 font-display text-[12.5px] font-semibold text-forest-deep outline-none focus:border-forest"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ),
          },
          { label: "Observed", value: relativeTime(summary.observedAt) },
          { label: "Source", value: summary.sourceLabel },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void fetchFarmWeather(activeFarm.id, true)}
              loading={weatherLoading}
              aria-label="Refresh weather data"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1" aria-hidden />
              Refresh
            </Button>
            {summary.sourceType === "live-provider" ? (
              <Badge tone="success" icon={<Plug className="h-3 w-3" aria-hidden />}>
                {summary.sourceLabel?.includes("WeatherAPI") ? "Live WeatherAPI.com" : "Live Weather Feed"}
              </Badge>
            ) : (
              <Badge tone="info" icon={<Info className="h-3 w-3" aria-hidden />}>
                Demo baseline
              </Badge>
            )}
          </div>
        }
      />

      {/* Missing Coordinates Notification Banner with Live Location Action */}
      {!hasCoords && (
        <div className="rounded-lg border border-gold/50 bg-gradient-to-r from-cream via-[#fbf7ee] to-gold/15 p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-cream shadow-xs">
                <LocateFixed className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-display text-[13.5px] font-bold text-forest-deep">
                  Enable Live Open-Meteo Forecast for {activeFarm.name}
                </p>
                <p className="text-[12px] leading-relaxed text-muted">
                  This farm is missing saved GPS coordinates. Detect device location using the Browser Geolocation API to connect real-time 10-day forecasts and harvest alerts.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleDetectAndSaveLocation}
              loading={locatingFarm}
              className="shrink-0 font-medium"
            >
              <Compass className="h-3.5 w-3.5 mr-1" aria-hidden />
              Detect & Save Location
            </Button>
          </div>
          {locateSuccess && (
            <div className="mt-3 flex items-center gap-1.5 rounded-md border border-living/30 bg-living/10 px-3 py-1.5 text-[12px] font-medium text-forest-deep">
              <CheckCircle2 className="h-3.5 w-3.5 text-living shrink-0" aria-hidden />
              <span>{locateSuccess}</span>
            </div>
          )}
          {locateError && (
            <div className="mt-3 flex items-center gap-1.5 rounded-md border border-danger/30 bg-[#fdf1ee] px-3 py-1.5 text-[12px] text-[#8d3a26]">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{locateError}</span>
            </div>
          )}
        </div>
      )}

      <section aria-label="Current conditions" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="relative overflow-hidden">
          <div className="relative border-b border-line bg-forest-deep px-6 py-7 text-cream">
            <div
              className="hw-drift pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(circle, rgba(184,203,167,0.5) 0%, rgba(184,203,167,0) 70%)",
              }}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="hw-eyebrow font-semibold text-sage/80">Most recent reading</p>
                <p className="hw-num mt-2 text-[52px] leading-none font-extrabold">
                  {formatTemperature(summary.temperatureC, settings.temperatureUnit)}
                </p>
                <p className="mt-2 font-display text-[14px] font-semibold">
                  {(CONDITION_LABEL[summary.condition] || "Partly cloudy")} · feels like {formatTemperature(summary.feelsLikeC ?? summary.temperatureC, settings.temperatureUnit)}
                </p>
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10 text-gold">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 p-5">
            {[
              { icon: Droplets, label: "Humidity", value: `${summary.humidity ?? 60}%` },
              { icon: Wind, label: "Wind", value: `${summary.windKph ?? 10} km/h` },
              { icon: CloudRain, label: "Rain today", value: `${summary.rainfallMm ?? 0} mm` },
              { icon: Thermometer, label: "10-day avg max", value: `${avgMax}°C` },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-line bg-cream/60 p-3.5">
                <dt className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <item.icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </dt>
                <dd className="hw-num mt-1.5 text-[19px] font-bold text-forest-deep">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-muted">
            {summary.forecastSummary || "HarvestWindow 10-day weather outlook."}
          </p>
        </Card>

        <Card>
          <CardHeader
            title="Ten-day context"
            subtitle={`Indicated rainfall totals ${Math.round(totalRain)} mm across the period.`}
            icon={<CalendarRange className="h-4 w-4" aria-hidden />}
          />
          <div className="p-5">
            <WeatherChart daily={daily} height={240} />
            <div className="hw-scroll-x mt-4 flex gap-2 overflow-x-auto pb-1">
              {daily.map((d) => {
                const DayIcon = CONDITION_ICON[d.condition] ?? CloudSun;
                return (
                  <motion.div
                    key={d.date}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "min-w-[86px] flex-1 rounded-md border p-2.5 text-center",
                      d.rainfallMm >= 15
                        ? "border-info/40 bg-[#eef4f8]"
                        : d.rainfallMm > 0
                          ? "border-line bg-white"
                          : "border-line bg-cream/60"
                    )}
                  >
                    <p className="font-mono text-[10px] tracking-wide text-muted uppercase">
                      {formatWeekday(d.date)}
                    </p>
                    <DayIcon className="mx-auto mt-1.5 h-4 w-4 text-forest" aria-hidden />
                    <p className="hw-num mt-1.5 text-[13px] font-bold text-forest-deep">
                      {d.maxTempC}°
                    </p>
                    <p className="font-mono text-[10px] text-muted">{d.rainfallMm} mm</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      {/* Phase AI-3: Farm Weather Risk & Harvest Readiness Posture */}
      {farmRiskSummary && farmRiskSummary.summary.totalCropsAssessed > 0 && (
        <section aria-label="Farm Harvest Weather Risk Posture">
          <Card className="overflow-hidden border-line">
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <CloudLightning className="w-4 h-4 text-forest" />
                  <span>Harvest Weather Posture · {activeFarm.name}</span>
                </div>
              }
              subtitle="Aggregated weather risk evaluating crop lodging, wet field conditions, and drying suitability across blocks."
              action={
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border",
                  farmRiskSummary.summary.overallFarmSuitability === "FAVORABLE"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : farmRiskSummary.summary.overallFarmSuitability === "CAUTION"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-red-100 text-red-800 border-red-300"
                )}>
                  {farmRiskSummary.summary.overallFarmSuitability} Farm Posture
                </span>
              }
            />

            <div className="p-5 pt-3 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-line bg-cream/40">
                  <span className="text-[11.5px] text-muted">Blocks Assessed</span>
                  <p className="text-[18px] font-bold text-forest-deep mt-0.5">
                    {farmRiskSummary.summary.totalCropsAssessed}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                  <span className="text-[11.5px] text-emerald-800">Favorable Blocks</span>
                  <p className="text-[18px] font-bold text-emerald-900 mt-0.5">
                    {farmRiskSummary.summary.favorableCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60">
                  <span className="text-[11.5px] text-amber-800">Caution Blocks</span>
                  <p className="text-[18px] font-bold text-amber-900 mt-0.5">
                    {farmRiskSummary.summary.cautionCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-red-200 bg-red-50/60">
                  <span className="text-[11.5px] text-red-800">Unfavorable Blocks</span>
                  <p className="text-[18px] font-bold text-red-900 mt-0.5">
                    {farmRiskSummary.summary.unfavorableCount}
                  </p>
                </div>
              </div>

              {farmRiskSummary.crops.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-[12px] font-bold text-forest-deep uppercase tracking-wider">
                    Block-Specific Harvest Weather Suitability
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {farmRiskSummary.crops.map((c) => (
                      <div
                        key={c.cropId}
                        onClick={() => c.cropId && navigate(`/app/crops/${c.cropId}`)}
                        className="p-3 rounded-lg border border-line/80 bg-white hover:bg-soft/50 transition-colors cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[13px] text-forest-deep truncate">
                              {c.cropName} {c.variety ? `(${c.variety})` : ""}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                              c.harvestSuitability === "FAVORABLE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : c.harvestSuitability === "CAUTION"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            )}>
                              {c.harvestSuitability}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-muted mt-1">
                            Risk score: <span className="font-semibold text-forest-deep">{c.overallRiskScore}/100</span> · {c.urgency} urgency
                          </p>
                        </div>
                        {c.recommendations[0] && (
                          <p className="text-[11px] text-forest-deep/80 mt-2 line-clamp-1 border-t border-line/40 pt-1.5">
                            {c.recommendations[0]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      <section aria-label="Harvest cautions" className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Harvest-related cautions"
            subtitle="Only the items that touch a harvest decision."
            icon={<TriangleAlert className="h-4 w-4" aria-hidden />}
          />
          <div className="flex flex-col gap-3 p-5">
            {cautions.length > 0 ? (
              cautions.map((c, idx) => (
                <div
                  key={c.id ? `${c.id}-${idx}` : `caution-${idx}`}
                  className={cn(
                    "rounded-md border p-4",
                    c.level === "caution"
                      ? "border-caution/40 bg-[#fdf6ec]"
                      : c.level === "watch"
                        ? "border-gold/50 bg-gold-soft/25"
                        : "border-line bg-cream/60"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={c.level === "caution" ? "caution" : c.level === "watch" ? "gold" : "neutral"}
                    >
                      {c.level}
                    </Badge>
                    <p className="font-display text-[13.5px] font-bold text-forest-deep">
                      {c.title}
                    </p>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{c.detail}</p>
                  <p className="mt-2 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                    {c.dates}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Sun className="h-5 w-5" aria-hidden />}
                title="No caution in the next ten days"
                description="Nothing in this dataset would materially affect a harvest decision for this farm."
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Crop-specific impact"
            subtitle="Wet days that fall inside — or just after — an estimated window."
            icon={<Sprout className="h-4 w-4" aria-hidden />}
          />
          <div className="flex flex-col gap-3 p-5">
            {overlaps.length > 0 ? (
              overlaps.map(({ crop, forecast, inRange, nearRange }) => (
                <Link
                  key={crop.id}
                  to={`/app/crops/${crop.id}`}
                  className="group rounded-md border border-line bg-white p-4 transition-colors hover:border-living"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-[13.5px] font-bold text-forest-deep">
                      {crop.name}
                      {crop.variety ? (
                        <span className="font-medium text-muted"> · {crop.variety}</span>
                      ) : null}
                    </p>
                    <Badge tone={inRange.length > 0 ? "caution" : "gold"}>
                      {inRange.length > 0
                        ? `${inRange.length} wet day${inRange.length === 1 ? "" : "s"} inside window`
                        : `${nearRange.length} wet day${nearRange.length === 1 ? "" : "s"} just after`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12.5px] text-muted">
                    Window {formatDate(forecast.estimatedWindowStart)} →{" "}
                    {formatDate(forecast.estimatedWindowEnd)} ·{" "}
                    {inRange.concat(nearRange).map((d) => formatDate(d)).slice(0, 3).join(", ")}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={<CloudSun className="h-5 w-5" aria-hidden />}
                title="No wet days overlap these windows"
                description="For the crops on this farm, the indicated rainfall falls outside the estimated harvest ranges."
              />
            )}
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Data source and integration"
          subtitle="Where these numbers come from, and how a live provider would replace them."
          icon={<Plug className="h-4 w-4" aria-hidden />}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-3">
          <div>
            <p className="hw-eyebrow font-semibold text-muted">Current source</p>
            <p className="mt-2 text-[13px] leading-relaxed text-forest-deep">
              {summary.sourceLabel}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Observed {relativeTime(summary.observedAt)} ({formatDate(summary.observedAt)}).
              The dataset is a stable regional pattern shipped with this frontend — it is not
              a live feed and does not claim to be one.
            </p>
          </div>
          <div>
            <p className="hw-eyebrow font-semibold text-muted">Interface</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Every screen reads weather through a single <code className="font-mono text-[12px] text-forest">WeatherProvider</code>{" "}
              contract: give it a farm (with optional coordinates), get back an observed
              snapshot, a daily forecast, cautions, a source label and a timestamp.
            </p>
          </div>
          <div>
            <p className="hw-eyebrow font-semibold text-muted">Going live</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Registering an API-backed provider replaces the demo values everywhere without
              touching UI code. Until then, forecasts that depend on weather say so
              explicitly in their contributing factors.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}


