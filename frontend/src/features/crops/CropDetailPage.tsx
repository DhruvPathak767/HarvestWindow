import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  CloudRain,
  Flame,
  Gauge,
  History,
  Info,
  Leaf,
  ListChecks,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, CardHeader, EmptyState, StatusBadge } from "@/components/common/ui";
import { Modal } from "@/components/common/Modal";
import { CropImage } from "@/components/common/CropImage";
import { HarvestTimeline } from "@/components/charts/HarvestTimeline";
import { StageLadder } from "@/components/charts/StageLadder";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { RecommendationCard } from "@/features/recommendations/RecommendationCard";
import { CROP_IMAGES, findCatalogEntry } from "@/data/mock/cropCatalog";
import { useStore } from "@/store/AppStore";
import { EditCropModal } from "./EditCropModal";
import { AgronomicKnowledgeCard } from "./AgronomicKnowledgeCard";
import { weatherService, CONDITION_LABEL } from "@/services/weather/weatherService";
import { daysLabel, formatDate, formatTime, relativeTime } from "@/utils/date";
import { cn } from "@/utils/cn";
import { api } from "@/services/api";
import { useToast } from "@/components/feedback/ToastProvider";

export default function CropDetailPage() {
  const { cropId } = useParams<{ cropId: string }>();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const {
    crops,
    farms,
    forecasts,
    weather,
    recommendations,
    removeCrop,
    setRecommendationStatus,
    refreshForecasts,
    refreshingForecasts,
  } = useStore();
  const { toast } = useToast();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [aiPredicting, setAiPredicting] = useState(false);
  const [liveAiPrediction, setLiveAiPrediction] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const crop = crops.find((c) => c.id === cropId) ?? null;

  useEffect(() => {
    if (cropId) {
      void api.getPredictionHistory(cropId).then((records) => {
        if (Array.isArray(records) && records.length > 0) {
          setHistoryList(records);
        }
      }).catch(() => {});
    }
  }, [cropId]);

  const handleRunAiPrediction = async () => {
    if (!crop) return;
    setAiPredicting(true);
    try {
      const res = await api.predictHarvest({
        cropId: crop.id,
        farmId: crop.farmId,
        sowingDate: crop.plantingDate,
        observedGrowthStage: crop.growthStage,
      });

      if (res && res.status === "success" && res.prediction) {
        setLiveAiPrediction(res.prediction);
        toast({
          tone: "success",
          title: "AI Harvest Prediction Updated",
          description: `Most likely harvest: ${res.prediction.most_likely_harvest_date} (${res.prediction.prediction_method})`,
        });
        void refreshForecasts(crop.name, crop.farmId, crop.id);
        const updatedHistory = await api.getPredictionHistory(crop.id);
        if (Array.isArray(updatedHistory)) setHistoryList(updatedHistory);
      } else if (res && res.status === "insufficient_data") {
        toast({
          tone: "warning",
          title: "Insufficient Data for Prediction",
          description: res.message || "Please provide required crop parameters.",
        });
      } else {
        toast({
          tone: "warning",
          title: "Prediction Completed via Fallback",
          description: res?.message || "Agronomic baseline was computed.",
        });
      }
    } catch (err: any) {
      toast({
        tone: "error",
        title: "Prediction Failed",
        description: err?.message || "Failed to contact prediction engine.",
      });
    } finally {
      setAiPredicting(false);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    if (!crop) return;
    setHistoryLoading(true);
    try {
      const records = await api.getPredictionHistory(crop.id);
      if (Array.isArray(records)) {
        setHistoryList(records);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!crop) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader eyebrow="Crop intelligence" title="Crop not found" />
        <EmptyState
          icon={<Sprout className="h-5 w-5" aria-hidden />}
          title="This crop record is not in the workspace"
          description="It may have been removed, or the link points at an older demo record."
          action={
            <Button size="sm" onClick={() => navigate("/app")}>
              Back to overview
            </Button>
          }
        />
      </div>
    );
  }

  const farm = farms.find((f) => f.id === crop.farmId) ?? null;
  const forecast = forecasts[crop.id];
  const farmWeather = farm ? weather[farm.id] ?? weatherService.snapshotForFarm(farm) : null;
  const entry = findCatalogEntry(crop.name);
  const cropRecommendations = recommendations.filter((r) => r.cropId === crop.id);
  const openRecommendations = cropRecommendations.filter((r) => r.status === "open");
  const confidence = forecast?.confidence;

  const windowState =
    forecast.daysToWindowStart > 0
      ? `Opens in ${daysLabel(forecast.daysToWindowStart)}`
      : forecast.daysToWindowEnd >= 0
        ? `Open now · closes in ${daysLabel(forecast.daysToWindowEnd)}`
        : `Closed ${daysLabel(forecast.daysToWindowEnd)}`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={farm ? `/app/farms/${farm.id}` : "/app"}
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-forest"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {farm ? farm.name : "Overview"}
      </Link>

      <PageHeader
        eyebrow="Crop intelligence"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <CropImage
              src={CROP_IMAGES[crop.name]}
              alt=""
              cropName={crop.name}
              className="h-11 w-11 shrink-0 rounded-md"
            />
            {crop.name}
            {crop.variety ? (
              <span className="font-display text-[22px] font-semibold text-muted">
                · {crop.variety}
              </span>
            ) : null}
          </span>
        }
        subtitle={
          entry
            ? entry.note
            : "No reference entry for this crop — a generic 110–140 day range is used instead."
        }
        meta={[
          {
            icon: <MapPin className="h-3.5 w-3.5" aria-hidden />,
            label: "Farm",
            value: farm ? `${farm.name} · ${farm.district}` : "Unassigned",
          },
          { label: "Sown", value: formatDate(crop.plantingDate) },
          { label: "Stage recorded", value: crop.growthStage ?? "Not recorded" },
          {
            icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
            label: "Updated",
            value: `${formatTime(forecast.updatedAt)} · ${relativeTime(forecast.updatedAt)}`,
          },
        ]}
        actions={
          <>
            <StatusBadge status={forecast.readinessStatus} full />
            <Button
              size="sm"
              variant="primary"
              onClick={handleRunAiPrediction}
              loading={aiPredicting}
              aria-label={`Run AI harvest prediction for ${crop.name}`}
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
              AI Recalculate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenHistory}
              aria-label="View prediction history"
            >
              <History className="h-3.5 w-3.5" aria-hidden />
              History{historyList.length > 0 ? ` (${historyList.length})` : ""}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void refreshForecasts(crop.name, crop.farmId, crop.id)}
              loading={refreshingForecasts}
              aria-label={`Refresh prediction for ${crop.name}`}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditOpen(true)}
              aria-label={`Edit ${crop.name} details`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmRemove(true)}
              aria-label={`Remove ${crop.name} record`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </Button>
          </>
        }
      />

      {/* Main prediction */}
      <section aria-label="Harvest prediction" className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="relative border-b border-line bg-forest-deep px-6 py-7 text-cream">
            <div
              className="hw-drift pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(circle, rgba(232,182,74,0.55) 0%, rgba(232,182,74,0) 68%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="hw-eyebrow font-semibold text-gold">Estimated harvest window</p>
                {forecast.weatherAdjustmentStatus === "APPLIED" ? (
                  <span className="rounded-full border border-gold/40 bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
                    Weather-adjusted ({forecast.weatherAdjustmentDays && forecast.weatherAdjustmentDays > 0 ? `+${forecast.weatherAdjustmentDays}d` : `${forecast.weatherAdjustmentDays}d`})
                  </span>
                ) : forecast.weatherAdjustmentStatus === "NOT_APPLIED" ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-cream/80">
                    Baseline duration · Weather normal
                  </span>
                ) : (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-cream/70">
                    Baseline estimate · Weather unavailable
                  </span>
                )}
              </div>
              <motion.p
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="hw-num mt-3 text-[28px] leading-tight font-extrabold sm:text-[38px]"
              >
                {formatDate(forecast.estimatedWindowStart)}
                <span className="mx-2.5 text-[22px] font-semibold text-sage">→</span>
                {formatDate(forecast.estimatedWindowEnd)}
              </motion.p>
              {forecast.baselineHarvestWindow?.startDate && forecast.weatherAdjustmentApplied && (
                <p className="mt-2 font-mono text-[12px] text-sage/90">
                  Agronomic baseline: {formatDate(forecast.baselineHarvestWindow.startDate)} → {formatDate(forecast.baselineHarvestWindow.endDate)}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-sage/85">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 text-gold" aria-hidden />
                  {windowState}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Leaf className="h-3.5 w-3.5 text-sage" aria-hidden />
                  {entry
                    ? `Reference duration ${entry.durationRange[0]}–${entry.durationRange[1]} days`
                    : "Generic reference duration 110–140 days"}
                </span>
                {crop.fieldArea && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sage" aria-hidden />
                    {crop.fieldArea} ha block
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <HarvestTimeline forecast={forecast} crop={crop} farmName={farm?.name} detailed />

            {/* Phase AI-2 Prediction Engine Details */}
            <div className="mt-6 rounded-lg border border-gold/30 bg-gradient-to-br from-cream/90 to-soft/40 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-forest-deep text-cream">
                    <Sparkles className="h-4 w-4 text-gold" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-[14px] font-bold text-forest-deep">
                      Harvest Window Prediction Engine
                    </h3>
                    <p className="font-mono text-[11px] text-muted">
                      {liveAiPrediction?.model_version || "Phase AI-2 Hybrid Engine · v2.0.0"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-forest/20 bg-forest/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-forest-deep">
                    <ShieldCheck className="h-3 w-3 text-living" aria-hidden />
                    {liveAiPrediction?.prediction_method === "agronomic_gdd_weather"
                      ? "Agronomic Baseline + GDD & Weather"
                      : liveAiPrediction?.prediction_method === "supervised_ml"
                        ? "Supervised ML"
                        : "ICAR Agronomic Baseline"}
                  </span>
                </div>
              </div>

              {/* Key AI Windows */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-line bg-white p-3">
                  <p className="hw-eyebrow text-[10px] text-muted uppercase">Earliest Harvest</p>
                  <p className="mt-1 font-mono text-[13.5px] font-bold text-forest-deep">
                    {formatDate(liveAiPrediction?.estimated_harvest_start || forecast.estimatedWindowStart)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">Window opening date</p>
                </div>
                <div className="rounded-md border border-gold/40 bg-gold/10 p-3">
                  <p className="hw-eyebrow text-[10px] font-bold text-[#8a6415] uppercase">Most Likely Date</p>
                  <p className="mt-1 font-mono text-[14px] font-black text-forest-deep">
                    {formatDate(liveAiPrediction?.most_likely_harvest_date || forecast.harvestWindow?.typicalDate || forecast.estimatedWindowStart)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#8a6415]">Optimal physiological maturity</p>
                </div>
                <div className="rounded-md border border-line bg-white p-3">
                  <p className="hw-eyebrow text-[10px] text-muted uppercase">Latest Safe Harvest</p>
                  <p className="mt-1 font-mono text-[13.5px] font-bold text-forest-deep">
                    {formatDate(liveAiPrediction?.estimated_harvest_end || forecast.estimatedWindowEnd)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">Pre-lodging/shattering bound</p>
                </div>
              </div>

              {/* GDD Phenology Progress Bar if available */}
              {(liveAiPrediction?.gdd_metrics || historyList[0]?.gddMetrics) && (() => {
                const gdd = liveAiPrediction?.gdd_metrics || historyList[0]?.gddMetrics;
                const progress = Math.min(100, Math.round(gdd.progress_percentage || gdd.progressPct || 0));
                return (
                  <div className="mt-4 rounded-md border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-forest-deep">
                        <Flame className="h-3.5 w-3.5 text-gold" aria-hidden />
                        Growing Degree-Day (GDD) Accumulation
                      </p>
                      <span className="font-mono text-[12px] font-semibold text-forest">
                        {gdd.accumulated_gdd || gdd.accumulatedGdd} / {gdd.required_maturity_gdd || gdd.requiredGdd} GDD ({progress}%)
                      </span>
                    </div>
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-soft">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-forest via-gold to-living transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-muted">
                      <span>Base temp T_base = {gdd.base_temperature_c || gdd.baseTemperatureC}°C</span>
                      {gdd.gdd_maturity_estimated_date && (
                        <span>Thermal maturity projected: {formatDate(gdd.gdd_maturity_estimated_date)}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Explanatory Factors */}
              {liveAiPrediction?.explanation && liveAiPrediction.explanation.length > 0 && (
                <div className="mt-4">
                  <p className="hw-eyebrow text-[11px] font-bold text-forest-deep uppercase">
                    Agronomic & Environmental Factors
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {liveAiPrediction.explanation.map((fac: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 rounded-md bg-white/80 px-3 py-2 text-[12px] text-forest-deep border border-line/60">
                        <span className={cn(
                          "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                          fac.impact === "delay" ? "bg-info" : fac.impact === "accelerate" ? "bg-gold" : "bg-living"
                        )} />
                        <span>{fac.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Honest Methodology Notice */}
              <div className="mt-4 flex items-start gap-2 rounded-md bg-cream/90 p-3 text-[11.5px] text-muted border border-line/70">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" aria-hidden />
                <p>
                  <span className="font-semibold text-forest-deep">Honest ML Disclosure:</span> Grounded in ICAR/SAU verified developmental benchmarks and Open-Meteo microclimate observations. Production supervised ML inference is held in reserve until actual verified farm harvest date observation pairs are logged to maintain zero false accuracy.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-cream/70 p-4">
                <p className="hw-eyebrow font-semibold text-living">Recommended next action</p>
                <p className="mt-2 text-[13.5px] leading-relaxed font-medium text-forest-deep">
                  {forecast.nextAction}
                </p>
                {crop.expectedYield && (
                  <p className="mt-2 text-[12px] text-muted">
                    Expected yield on record: {crop.expectedYield}
                  </p>
                )}
              </div>
              <div className="rounded-md border border-line bg-cream/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="hw-eyebrow font-semibold text-info">Weather model integration</p>
                  {forecast.weatherAdjustmentStatus && (
                    <span className="font-mono text-[10px] font-bold tracking-wider text-muted uppercase">
                      {forecast.weatherAdjustmentStatus}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-forest-deep">
                  {forecast.weatherNote || "Phase AI-2 hybrid model active."}
                </p>
                <p className="mt-2 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                  {farmWeather?.sourceLabel ?? "Open-Meteo & Weather Provider"}
                  {forecast.weatherDataTimestamp ? ` · synced ${relativeTime(forecast.weatherDataTimestamp)}` : ""}
                </p>
              </div>
            </div>

            {crop.notes && (
              <p className="mt-4 rounded-md border border-line bg-white px-4 py-3 text-[12.5px] leading-relaxed text-muted">
                <span className="font-semibold text-forest-deep">Field notes: </span>
                {crop.notes}
              </p>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          {/* Confidence */}
          <Card>
            <CardHeader
              title="Forecast confidence"
              subtitle="Input completeness — not a claim about prediction accuracy."
              icon={<Gauge className="h-4 w-4" aria-hidden />}
            />
            <div className="flex items-center gap-5 p-5">
              <ConfidenceRing value={confidence ?? 0} />
              <div className="min-w-0">
                <p className="hw-num text-[28px] leading-none font-extrabold text-forest-deep">
                  {confidence ?? "—"}%
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  Based on which inputs are present: planting date, variety, stage, area,
                  irrigation and an attached weather dataset.
                </p>
              </div>
            </div>
          </Card>

          {/* Weather impact */}
          <Card>
            <CardHeader
              title="Weather impact"
              subtitle={farmWeather ? farmWeather.locationLabel : "No farm context"}
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
            {farmWeather ? (
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="hw-num text-[30px] leading-none font-extrabold text-forest-deep">
                    {farmWeather.temperatureC}°
                  </p>
                  <p className="text-right text-[12px] text-muted">
                    {CONDITION_LABEL[farmWeather.condition]}
                    <br />
                    {farmWeather.rainfallMm} mm recorded
                  </p>
                </div>
                <WeatherChart
                  daily={farmWeather.daily}
                  className="mt-4"
                  height={170}
                  showRainAxis={false}
                />
                {farmWeather.cautions.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-2">
                    {farmWeather.cautions.map((c, idx) => (
                      <li
                        key={c.id ? `${c.id}-${idx}` : `caution-${idx}`}
                        className={cn(
                          "rounded-md border px-3.5 py-2.5",
                          c.level === "caution"
                            ? "border-caution/40 bg-[#fdf6ec]"
                            : "border-line bg-cream/70"
                        )}
                      >
                        <p className="font-display text-[12.5px] font-bold text-forest-deep">
                          {c.title}
                        </p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">{c.detail}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-md border border-line bg-cream/70 px-3.5 py-2.5 text-[12.5px] text-muted">
                    No harvest-related weather caution in this dataset for the next ten days.
                  </p>
                )}
                <p className="mt-3 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                  {farmWeather.sourceLabel} · observed {relativeTime(farmWeather.observedAt)}
                </p>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<CloudRain className="h-5 w-5" aria-hidden />}
                  title="Weather unavailable"
                  description="This crop is not attached to a farm with a weather dataset, so the estimate uses crop reference data only."
                />
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Verified Agronomic Knowledge Base (Phase AI-1) */}
      <section aria-label="Agronomic Knowledge Base">
        <AgronomicKnowledgeCard
          cropName={crop.name}
          cropVariety={crop.variety}
          farmState={farm?.state}
          farmDistrict={farm?.district}
        />
      </section>

      {/* Growth progression + explanation */}
      <section aria-label="Progression and explanation" className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Growth and readiness progression"
            subtitle="Crop-specific stages. Past stages are derived from the recorded planting date; future stages are estimates."
            icon={<Sprout className="h-4 w-4" aria-hidden />}
          />
          <div className="p-5">
            <StageLadder forecast={forecast} />
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="How this estimate was built"
              subtitle="Every factor that went into the window, in plain language."
              icon={<Info className="h-4 w-4" aria-hidden />}
            />
            <div className="p-5">
              <p className="rounded-md border border-line bg-cream/70 px-4 py-3 text-[13px] leading-relaxed text-forest-deep">
                Your estimated harvest window is{" "}
                <span className="font-semibold">
                  {formatDate(forecast.estimatedWindowStart)} to{" "}
                  {formatDate(forecast.estimatedWindowEnd)}
                </span>
                . The estimate is built from the recorded planting date of{" "}
                {formatDate(crop.plantingDate)}, the reference duration for {crop.name}
                {crop.variety ? ` (${crop.variety})` : ""}, and the{" "}
                {farmWeather ? "demo weather dataset attached to this farm" : "crop reference data alone"}.
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {forecast.contributingFactors.map((f) => (
                  <motion.li
                    key={f.label}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 rounded-md border border-line bg-white px-3.5 py-3"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        f.direction === "advances"
                          ? "bg-gold"
                          : f.direction === "delays"
                            ? "bg-info"
                            : f.direction === "supports"
                              ? "bg-living"
                              : "bg-line"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-forest-deep">
                        {f.label}
                        <Badge tone="neutral">{f.weight} weight</Badge>
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{f.detail}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <p className="mt-4 flex items-start gap-2 rounded-md border border-line bg-soft/60 px-4 py-3 text-[12px] leading-relaxed text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" aria-hidden />
                {forecast.modelNote}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recommendations for this crop"
              subtitle={`${openRecommendations.length} open · ${cropRecommendations.length} total`}
              icon={<ListChecks className="h-4 w-4" aria-hidden />}
              action={
                <Link
                  to="/app/recommendations"
                  className="text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
                >
                  All actions
                </Link>
              }
            />
            <div className="flex flex-col gap-4 p-5">
              {cropRecommendations.length > 0 ? (
                cropRecommendations.map((rec, i) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    crop={crop}
                    farm={farm}
                    delay={i * 0.05}
                    onStatus={(status) => void setRecommendationStatus(rec.id, status)}
                  />
                ))
              ) : (
                <div className="rounded-md border border-line bg-cream/70 p-4">
                  <p className="flex items-center gap-2 font-display text-[13px] font-bold text-forest-deep">
                    <CheckCircle2 className="h-4 w-4 text-living" aria-hidden />
                    No specific recommendation recorded
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    Suggested next step from the forecast: {forecast.nextAction}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${crop.name}?`}
        description="The crop record and its associated data will be removed from the workspace. This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
              Keep record
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={removing}
              onClick={async () => {
                setRemoving(true);
                try {
                  await removeCrop(crop.id);
                  setConfirmRemove(false);
                  navigate(farm ? `/app/farms/${farm.id}` : "/app");
                } catch {
                  setRemoving(false);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove crop
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          Farm: {farm?.name ?? "—"} · Sown {formatDate(crop.plantingDate)} · Estimated window{" "}
          {formatDate(forecast.estimatedWindowStart)} to {formatDate(forecast.estimatedWindowEnd)}.
        </p>
      </Modal>

      <EditCropModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        crop={crop}
      />

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Prediction History · ${crop.name}`}
        description="Audit log of previous harvest window predictions saved in the database."
        size="lg"
      >
        <div className="flex flex-col gap-4">
          {historyLoading ? (
            <p className="py-6 text-center text-[13px] text-muted">Loading prediction audit records...</p>
          ) : historyList.length > 0 ? (
            <div className="hw-scroll-x overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line bg-cream/70 text-[11px] font-semibold text-muted uppercase">
                    <th className="px-3 py-2">Computed</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Optimal Date</th>
                    <th className="px-3 py-2">Window Range</th>
                    <th className="px-3 py-2">Thermal GDD</th>
                    <th className="px-3 py-2">Weather Adj</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((rec) => (
                    <tr key={rec.id} className="border-b border-line/60 last:border-0 hover:bg-soft/40">
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-muted">
                        {formatDate(rec.predictionDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest-deep">
                          {rec.predictionMethod === "agronomic_gdd_weather"
                            ? "GDD + Weather"
                            : rec.predictionMethod === "agronomic_baseline"
                              ? "Agronomic Baseline"
                              : rec.predictionMethod}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-forest-deep">
                        {formatDate(rec.mostLikelyHarvestDate)}
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {formatDate(rec.estimatedHarvestStart)} → {formatDate(rec.estimatedHarvestEnd)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted">
                        {rec.gddMetrics ? `${rec.gddMetrics.accumulatedGdd} / ${rec.gddMetrics.requiredGdd} GDD` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {rec.weatherAdjustmentDays !== 0 ? (
                          <span className="rounded-md bg-gold/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#8a6415]">
                            {rec.weatherAdjustmentDays > 0 ? `+${rec.weatherAdjustmentDays}d` : `${rec.weatherAdjustmentDays}d`}
                          </span>
                        ) : (
                          <span className="text-muted">0d</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-muted">
              <p className="text-[13px]">No saved prediction records found for this crop yet.</p>
              <p className="mt-1 text-[12px]">Click &quot;AI Recalculate&quot; above to compute and persist the first forecast.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#E3E7DC" strokeWidth="6" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={value >= 80 ? "#5B8C45" : value >= 65 ? "#E8B64A" : "#C9762F"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-semibold text-muted">
        {value}%
      </span>
    </div>
  );
}
