import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Layers, MapPin, Pencil, Plus, Sprout, Tractor, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState, StatusBadge } from "@/components/common/ui";
import { Modal } from "@/components/common/Modal";
import { AddFarmModal } from "@/features/farms/AddFarmModal";
import { EditFarmModal } from "@/features/farms/EditFarmModal";
import { CropImage } from "@/components/common/CropImage";
import { CROP_IMAGES } from "@/data/mock/cropCatalog";
import { useStore } from "@/store/AppStore";
import { formatDate, formatDateRange } from "@/utils/date";
import type { Farm, ReadinessStatus } from "@/types";
import { cn } from "@/utils/cn";

const STATUS_ORDER: ReadinessStatus[] = [
  "in-window",
  "caution",
  "approaching",
  "growing",
  "passed",
];

export default function FarmsPage() {
  const { farms, crops, forecasts, selectedFarmId, selectFarm, deleteFarm } = useStore();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [addOpen, setAddOpen] = useState(false);
  const [farmToEdit, setFarmToEdit] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const handleDeleteFarm = async () => {
    if (!farmToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFarm(farmToDelete.id);
      setFarmToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete farm");
    } finally {
      setDeleting(false);
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farms
      .filter(
        (f) =>
          !q ||
          `${f.name} ${f.district} ${f.state} ${f.village || f.villageOrTaluka || ""} ${f.pincode || f.postalCode || ""}`
            .toLowerCase()
            .includes(q)
      )
      .map((farm) => {
        const farmCrops = crops.filter((c) => c.farmId === farm.id);
        const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
          acc[s] = farmCrops.filter((c) => forecasts[c.id]?.readinessStatus === s).length;
          return acc;
        }, {});
        const upcoming = farmCrops
          .map((c) => ({ crop: c, forecast: forecasts[c.id] }))
          .filter((x) => x.forecast && x.forecast.daysToWindowEnd >= 0)
          .sort(
            (a, b) =>
              Math.max(a.forecast.daysToWindowStart, 0) -
              Math.max(b.forecast.daysToWindowStart, 0)
          )[0];
        return { farm, farmCrops, counts, upcoming };
      });
  }, [farms, crops, forecasts, query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Farm management"
        title="My farms"
        subtitle="Each farm carries its own location, area unit and weather context. Selecting one focuses the whole workspace."
        meta={[
          {
            icon: <Tractor className="h-3.5 w-3.5" aria-hidden />,
            label: "Farms",
            value: farms.length,
          },
          {
            icon: <Sprout className="h-3.5 w-3.5" aria-hidden />,
            label: "Crop records",
            value: crops.length,
          },
        ]}
        actions={
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search farms…"
              aria-label="Search farms"
              className="h-9 w-full rounded-sm border border-line bg-white px-3 text-[13px] outline-none focus:border-forest sm:w-48"
            />
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add farm
            </Button>
          </>
        }
      />

      {rows.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map(({ farm, farmCrops, counts, upcoming }, i) => (
            <motion.div
              key={farm.id}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: reduced ? 0 : i * 0.06 }}
            >
              <Card hover className="flex h-full flex-col overflow-hidden">
                <div className="flex items-stretch gap-0">
                  <CropImage
                    src={farmCrops[0] ? CROP_IMAGES[farmCrops[0].name] : undefined}
                    alt={`${farm.name} — representative crop view`}
                    cropName={farm.name}
                    className="hidden w-32 shrink-0 sm:block"
                  />
                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-[18px] leading-tight font-bold text-forest-deep">
                          {farm.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {farm.district}, {farm.state}
                        </p>
                      </div>
                      <span className="hw-num shrink-0 rounded-sm bg-soft px-2.5 py-1 text-[12.5px] font-bold text-forest-deep">
                        {farm.area} {String(farm.areaUnit).toLowerCase() === "acre" ? "ac" : "ha"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-1 text-[11px] font-semibold text-muted"
                        >
                          <StatusBadge status={s} />
                          {counts[s]}
                        </span>
                      ))}
                      {farmCrops.length === 0 && (
                        <span className="text-[12px] text-muted">No crops recorded yet</span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-line pt-3 text-[12.5px] sm:grid-cols-2">
                      <div>
                        <p className="text-muted">Blocks</p>
                        <p className="mt-0.5 font-display font-bold text-forest-deep">
                          {farmCrops.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted">Next estimated window</p>
                        <p className="hw-num mt-0.5 font-bold text-forest-deep">
                          {upcoming
                            ? formatDateRange(
                                upcoming.forecast.estimatedWindowStart,
                                upcoming.forecast.estimatedWindowEnd
                              )
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          selectFarm(farm.id);
                          navigate(`/app/farms/${farm.id}`);
                        }}
                      >
                        Open farm
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => selectFarm(farm.id)}
                        aria-pressed={selectedFarmId === farm.id}
                      >
                        {selectedFarmId === farm.id ? "Focused in workspace" : "Focus in workspace"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFarmToEdit(farm)}
                        aria-label={`Edit ${farm.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeleteError(null);
                          setFarmToDelete(farm);
                        }}
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${farm.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </Button>
                      <span className="ml-auto font-mono text-[10.5px] tracking-wide text-muted uppercase">
                        Added {formatDate(farm.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden />}
          title={farms.length === 0 ? "No farms yet" : "No farm matches that search"}
          description={
            farms.length === 0
              ? "Add a farm with its location and size. Crops you add afterwards attach to it and inherit its weather context."
              : "Clear the search field to see every farm in the plan."
          }
          action={
            farms.length === 0 ? (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add farm
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setQuery("")}>
                Clear search
              </Button>
            )
          }
        />
      )}

      <p
        className={cn(
          "rounded-md border border-line bg-white/70 px-4 py-3 text-[12px] leading-relaxed text-muted"
        )}
      >
        Farm records are managed securely via the backend API and persisted in the database.
      </p>

      <AddFarmModal open={addOpen} onClose={() => setAddOpen(false)} />

      {farmToEdit && (
        <EditFarmModal
          open={!!farmToEdit}
          onClose={() => setFarmToEdit(null)}
          farm={farmToEdit}
        />
      )}

      {farmToDelete && (
        <Modal
          open={!!farmToDelete}
          onClose={() => {
            if (!deleting) {
              setFarmToDelete(null);
              setDeleteError(null);
            }
          }}
          title={`Delete ${farmToDelete.name}`}
          description="Confirm permanent removal of this farm record."
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFarmToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteFarm}
                loading={deleting}
                className="bg-danger text-white hover:bg-danger/90"
              >
                Delete farm
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 py-1">
            {deleteError && (
              <div
                role="alert"
                className="rounded-md border border-danger/35 bg-[#fdf1ee] p-3 text-[12.5px] text-[#8d3a26]"
              >
                {deleteError}
              </div>
            )}
            <p className="text-[13px] leading-relaxed text-muted">
              Are you sure you want to permanently delete <strong>{farmToDelete.name}</strong> ({farmToDelete.district}, {farmToDelete.state})? This will detach or remove any crop blocks and harvest estimates associated with this farm.
            </p>
          </div>
        </Modal>
      )}

      <Link to="/app" className="sr-only">
        Back to overview
      </Link>
    </div>
  );
}
