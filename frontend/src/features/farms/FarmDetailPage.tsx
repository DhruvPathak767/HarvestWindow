import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  Compass,
  Layers,
  MapPin,
  Plus,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader, EmptyState } from "@/components/common/ui";
import { MetricPanel } from "@/features/common/MetricPanel";
import { CropCard } from "@/features/crops/CropCard";
import { AddCropModal } from "@/features/crops/AddCropModal";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { useStore } from "@/store/AppStore";
import { CONDITION_LABEL, weatherService } from "@/services/weather/weatherService";
import { formatDate, relativeTime } from "@/utils/date";

export default function FarmDetailPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const { farms, crops, forecasts, weather, selectedFarmId, selectFarm } = useStore();
  const [addOpen, setAddOpen] = useState(false);

  const farm = farms.find((f) => f.id === farmId) ?? null;
  const farmCrops = useMemo(
    () => (farm ? crops.filter((c) => c.farmId === farm.id) : []),
    [crops, farm]
  );

  if (!farm) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader eyebrow="Farm" title="Farm not found" />
        <EmptyState
          icon={<MapPin className="h-5 w-5" aria-hidden />}
          title="This farm is not in the workspace"
          description="It may have been removed, or the link points at an older demo record."
          action={
            <Button size="sm" onClick={() => navigate("/app/farms")}>
              Back to farms
            </Button>
          }
        />
      </div>
    );
  }

  const farmWeather = weather[farm.id] ?? weatherService.snapshotForFarm(farm);
  const approaching = farmCrops.filter(
    (c) => forecasts[c.id]?.readinessStatus === "approaching"
  ).length;
  const attention = farmCrops.filter((c) => {
    const s = forecasts[c.id]?.readinessStatus;
    return s === "caution" || s === "passed";
  }).length;
  const trackedArea = Math.round(
    farmCrops.reduce((sum, c) => sum + (c.fieldArea ?? 0), 0) * 10
  ) / 10;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/app/farms"
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-forest"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All farms
      </Link>

      <PageHeader
        eyebrow="Farm detail"
        title={farm.name}
        subtitle={farm.notes ?? "No notes recorded for this farm yet."}
        meta={[
          {
            icon: <MapPin className="h-3.5 w-3.5" aria-hidden />,
            label: "Location",
            value: `${farm.district}, ${farm.state}`,
          },
          {
            icon: <Compass className="h-3.5 w-3.5" aria-hidden />,
            label: "Coordinates",
            value:
              farm.latitude && farm.longitude
                ? `${farm.latitude.toFixed(3)}, ${farm.longitude.toFixed(3)}`
                : "Not recorded",
          },
          { icon: <Layers className="h-3.5 w-3.5" aria-hidden />, label: "Area", value: `${farm.area} ${farm.areaUnit === "hectare" ? "ha" : "ac"}` },
          { label: "Added", value: formatDate(farm.createdAt) },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectFarm(farm.id)}
              aria-pressed={selectedFarmId === farm.id}
            >
              {selectedFarmId === farm.id ? "Focused in workspace" : "Focus in workspace"}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add crop here
            </Button>
          </>
        }
      />

      <section aria-label="Farm indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricPanel
          label="Crop blocks"
          value={farmCrops.length}
          icon={<Sprout className="h-4 w-4" aria-hidden />}
          context="Records attached to this farm."
        />
        <MetricPanel
          label="Approaching window"
          value={approaching}
          icon={<CalendarRange className="h-4 w-4" aria-hidden />}
          tone="gold"
          delay={0.06}
          context="Opening within roughly three weeks."
        />
        <MetricPanel
          label="Needs attention"
          value={attention}
          icon={<TriangleAlert className="h-4 w-4" aria-hidden />}
          tone="caution"
          delay={0.12}
          context={attention === 0 ? "Nothing flagged." : "Weather caution or window closed."}
        />
        <MetricPanel
          label="Recorded block area"
          value={trackedArea}
          decimals={1}
          unit={farm.areaUnit === "hectare" ? "ha" : "ac"}
          icon={<Layers className="h-4 w-4" aria-hidden />}
          tone="earth"
          delay={0.18}
          context={
            trackedArea > 0
              ? `Of ${farm.area} ${farm.areaUnit === "hectare" ? "ha" : "ac"} total holding.`
              : "Add field areas on each crop to track coverage."
          }
        />
      </section>

      <section
        aria-label="Crops and weather"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-[19px] leading-tight font-bold text-forest-deep">
            Blocks on this farm
          </h2>
          {farmCrops.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {farmCrops.map((crop, i) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  farm={farm}
                  forecast={forecasts[crop.id]}
                  delay={i * 0.05}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sprout className="h-5 w-5" aria-hidden />}
              title="No crops on this farm yet"
              description="Add a crop with its planting date and the first harvest window will be generated immediately."
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add crop
                </Button>
              }
            />
          )}
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Weather context"
            subtitle={`${farmWeather.locationLabel} · ${CONDITION_LABEL[farmWeather.condition]}`}
            icon={<MapPin className="h-4 w-4" aria-hidden />}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("/app/weather")}>
                Weather page
              </Button>
            }
          />
          <div className="p-5">
            <div className="flex items-end justify-between gap-4">
              <p className="hw-num text-[40px] leading-none font-extrabold text-forest-deep">
                {farmWeather.temperatureC}°
              </p>
              <p className="text-right text-[12px] text-muted">
                Feels like {farmWeather.feelsLikeC}°
                <br />
                {farmWeather.humidity}% humidity
              </p>
            </div>
            <WeatherChart daily={farmWeather.daily} className="mt-4" height={200} showRainAxis={false} />
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              {farmWeather.forecastSummary}
            </p>
            <p className="mt-3 font-mono text-[10.5px] tracking-wide text-muted uppercase">
              {farmWeather.sourceLabel} · observed {relativeTime(farmWeather.observedAt)}
            </p>
          </div>
        </Card>
      </section>

      <AddCropModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultFarmId={farm.id}
        onCreated={(cropId) => navigate(`/app/crops/${cropId}`)}
      />
    </div>
  );
}
