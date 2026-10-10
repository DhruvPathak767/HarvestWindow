import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  Compass,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Sprout,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader, EmptyState } from "@/components/common/ui";
import { Modal } from "@/components/common/Modal";
import { MetricPanel } from "@/features/common/MetricPanel";
import { CropCard } from "@/features/crops/CropCard";
import { AddCropModal } from "@/features/crops/AddCropModal";
import { EditFarmModal } from "@/features/farms/EditFarmModal";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { useStore } from "@/store/AppStore";
import { CONDITION_LABEL, weatherService } from "@/services/weather/weatherService";
import { formatDate, relativeTime } from "@/utils/date";

export default function FarmDetailPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const {
    farms,
    crops,
    forecasts,
    weather,
    selectedFarmId,
    selectFarm,
    fetchFarm,
    deleteFarm,
  } = useStore();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const farm = farms.find((f) => f.id === farmId) ?? null;

  // If not found in store on direct load/refresh, fetch from backend API
  useEffect(() => {
    if (!farm && farmId) {
      setLoading(true);
      fetchFarm(farmId).finally(() => setLoading(false));
    }
  }, [farm, farmId, fetchFarm]);

  const farmCrops = useMemo(
    () => (farm ? crops.filter((c) => c.farmId === farm.id) : []),
    [crops, farm]
  );

  const handleDeleteConfirm = async () => {
    if (!farm) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFarm(farm.id);
      setDeleteOpen(false);
      navigate("/app/farms", { replace: true });
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete farm from server"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader eyebrow="Farm detail" title="Loading farm..." />
        <div className="h-40 rounded-md border border-line bg-white/50 animate-pulse" />
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader eyebrow="Farm" title="Farm not found" />
        <EmptyState
          icon={<MapPin className="h-5 w-5" aria-hidden />}
          title="This farm is not in the workspace"
          description="It may have been removed, or the link points at an older record."
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
  const trackedArea =
    Math.round(
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
            value: (farm.village || farm.villageOrTaluka)
              ? `${farm.village || farm.villageOrTaluka}, ${farm.district}, ${farm.state}${(farm.pincode || farm.postalCode) ? ` (${farm.pincode || farm.postalCode})` : ""}`
              : `${farm.district}, ${farm.state}${(farm.pincode || farm.postalCode) ? ` (${farm.pincode || farm.postalCode})` : ""}`,
          },
          {
            icon: <Sprout className="h-3.5 w-3.5" aria-hidden />,
            label: "Soil & Water",
            value:
              farm.soilType || farm.irrigationSource
                ? `${farm.soilType || "Standard soil"} · ${farm.irrigationSource || "Mixed water"}`
                : "Not specified",
          },
          {
            icon: <Compass className="h-3.5 w-3.5" aria-hidden />,
            label: "Coordinates",
            value:
              farm.latitude && farm.longitude
                ? `${farm.latitude.toFixed(3)}, ${farm.longitude.toFixed(3)}`
                : "Not recorded",
          },
          {
            icon: <Layers className="h-3.5 w-3.5" aria-hidden />,
            label: "Area",
            value: `${farm.area} ${farm.areaUnit === "hectare" ? "ha" : "ac"}`,
          },
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditOpen(true)}
              aria-label="Edit farm details"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-danger hover:bg-danger/10 hover:text-danger"
              aria-label="Delete farm"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
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

      <EditFarmModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        farm={farm}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteError(null);
            setDeleteOpen(false);
          }
        }}
        title={`Delete ${farm.name}?`}
        description="This action removes the farm record from your workspace."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteConfirm}
              loading={deleting}
              className="bg-danger text-white hover:bg-danger/90"
            >
              Delete farm
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 py-1">
          {farmCrops.length > 0 && (
            <div className="rounded-md border border-caution/40 bg-[#fdfaf2] p-3 text-[12.5px] text-[#70520a]">
              <strong>Warning:</strong> This farm currently has{" "}
              {farmCrops.length} crop block(s) associated with it. Deleting the
              farm will detach or remove these blocks.
            </div>
          )}
          {deleteError && (
            <div
              role="alert"
              className="rounded-md border border-danger/35 bg-[#fdf1ee] p-3 text-[12.5px] text-[#8d3a26]"
            >
              {deleteError}
            </div>
          )}
          <p className="text-[13px] leading-relaxed text-muted">
            Are you sure you want to permanently remove <strong>{farm.name}</strong> ({farm.district}, {farm.state})?
          </p>
        </div>
      </Modal>
    </div>
  );
}
