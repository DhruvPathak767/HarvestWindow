import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  List,
  Plus,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader, EmptyState, StatusBadge } from "@/components/common/ui";
import { SegmentedControl } from "@/components/common/fields";
import { WindowGantt } from "@/components/charts/WindowGantt";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import type { ReadinessStatus } from "@/types";
import { READINESS_META } from "@/types";
import { formatDate, formatDateRange } from "@/utils/date";
import { cn } from "@/utils/cn";

type ViewMode = "timeline" | "list";
type StatusFilter = "all" | ReadinessStatus;

export default function ForecastPage() {
  const navigate = useNavigate();
  const {
    farms,
    crops,
    forecasts,
    selectedFarmId,
    selectFarm,
    refreshForecasts,
    refreshingForecasts,
  } = useStore();
  const [view, setView] = useState<ViewMode>("timeline");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [farmFilter, setFarmFilter] = useState<string>(selectedFarmId);

  // Sync farmFilter whenever selectedFarmId or farms change
  useEffect(() => {
    if (selectedFarmId === ALL_FARMS || farms.some((f) => f.id === selectedFarmId)) {
      setFarmFilter(selectedFarmId);
    } else {
      setFarmFilter(ALL_FARMS);
    }
  }, [selectedFarmId, farms]);

  // Defensive fallback: if farmFilter points to an unknown farm, treat as ALL_FARMS
  const effectiveFarmFilter = useMemo(() => {
    if (farmFilter === ALL_FARMS) return ALL_FARMS;
    if (farms.some((f) => f.id === farmFilter)) return farmFilter;
    return ALL_FARMS;
  }, [farmFilter, farms]);

  const rows = useMemo(() => {
    const scoped =
      effectiveFarmFilter === ALL_FARMS ? crops : crops.filter((c) => c.farmId === effectiveFarmFilter);
    return scoped
      .map((crop) => ({
        crop,
        forecast: forecasts[crop.id],
        farmName: farms.find((f) => f.id === crop.farmId)?.name ?? "—",
      }))
      .filter((r) => r.forecast && (status === "all" || r.forecast.readinessStatus === status))
      .sort(
        (a, b) =>
          Math.max(a.forecast.daysToWindowStart, 0) - Math.max(b.forecast.daysToWindowStart, 0)
      );
  }, [crops, forecasts, farms, effectiveFarmFilter, status]);

  const counts = useMemo(() => {
    const scoped =
      effectiveFarmFilter === ALL_FARMS ? crops : crops.filter((c) => c.farmId === effectiveFarmFilter);
    const base: Record<string, number> = { all: scoped.length };
    for (const crop of scoped) {
      const s = forecasts[crop.id]?.readinessStatus;
      if (s) base[s] = (base[s] ?? 0) + 1;
    }
    return base;
  }, [crops, forecasts, effectiveFarmFilter]);

  const statuses: StatusFilter[] = [
    "all",
    "growing",
    "approaching",
    "in-window",
    "caution",
    "passed",
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Forecast workspace"
        title="Harvest windows side by side"
        subtitle="Compare every block in the plan against one shared timeline. Windows are ranges; the today-marker shows where each crop actually sits."
        meta={[
          { label: "Forecasts", value: rows.length },
          {
            icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
            label: "Source",
            value: "Rule-based demo engine",
          },
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void refreshForecasts("forecast workspace", effectiveFarmFilter === ALL_FARMS ? undefined : effectiveFarmFilter)}
              loading={refreshingForecasts}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/app")}>
              <Plus className="h-4 w-4" aria-hidden />
              Add crop
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Filters"
          subtitle="Narrow the comparison by farm and readiness state."
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          action={
            <SegmentedControl<ViewMode>
              ariaLabel="Forecast view"
              value={view}
              onChange={setView}
              options={[
                { value: "timeline", label: "Timeline", icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden /> },
                { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" aria-hidden /> },
              ]}
            />
          }
        />
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  status === s
                    ? "border-forest-deep bg-forest-deep text-cream"
                    : "border-line bg-white text-muted hover:border-living hover:text-forest-deep"
                )}
              >
                {s === "all" ? "All states" : READINESS_META[s as ReadinessStatus].short}
                <span className="ml-1.5 font-mono text-[10.5px] opacity-70">
                  {counts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by farm"
            value={effectiveFarmFilter}
            onChange={(e) => {
              setFarmFilter(e.target.value);
              selectFarm(e.target.value);
            }}
            className="h-9 rounded-sm border border-line bg-white px-3 text-[13px] font-medium text-forest-deep outline-none focus:border-forest"
          >
            <option value={ALL_FARMS}>All farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {rows.length > 0 ? (
        view === "timeline" ? (
          <Card>
            <CardHeader
              title="Window comparison"
              subtitle="Gold bands are estimated ranges. The vertical rule is today."
              icon={<CalendarRange className="h-4 w-4" aria-hidden />}
            />
            <div className="p-5">
              <WindowGantt rows={rows} />
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title="Forecast list"
              subtitle="Sortable-by-date view of every estimate in the current selection."
              icon={<List className="h-4 w-4" aria-hidden />}
            />
            <div className="hw-scroll-x overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">
                  Harvest forecast list with crop, farm, window, readiness and confidence
                </caption>
                <thead>
                  <tr className="border-b border-line bg-cream/70">
                    {["Crop", "Farm", "Sown", "Estimated window", "Opens", "Readiness", "Inputs"].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="hw-eyebrow px-4 py-3 font-semibold text-muted"
                        >
                          {h}
                        </th>
                      )
                    )}
                    <th scope="col" className="sr-only">
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.crop.id}
                      className="border-b border-line/70 transition-colors last:border-0 hover:bg-soft/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/app/crops/${row.crop.id}`}
                          className="font-display text-[13.5px] font-bold text-forest-deep transition-colors hover:text-forest"
                        >
                          {row.crop.name}
                          {row.crop.variety ? (
                            <span className="font-medium text-muted"> · {row.crop.variety}</span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-muted">{row.farmName}</td>
                      <td className="hw-num px-4 py-3 font-mono text-[11.5px] text-muted">
                        {formatDate(row.crop.plantingDate)}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] font-semibold text-forest-deep">
                        {formatDateRange(
                          row.forecast.estimatedWindowStart,
                          row.forecast.estimatedWindowEnd
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-muted">
                        {row.forecast.daysToWindowStart > 0
                          ? `in ${row.forecast.daysToWindowStart}d`
                          : row.forecast.daysToWindowEnd >= 0
                            ? "open now"
                            : `closed ${Math.abs(row.forecast.daysToWindowEnd)}d`}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.forecast.readinessStatus} />
                      </td>
                      <td className="hw-num px-4 py-3 text-[12.5px] font-semibold text-muted">
                        {typeof row.forecast.confidence === "number"
                          ? row.forecast.confidence
                          : row.forecast.confidenceScore ?? "—"}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/app/crops/${row.crop.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest transition-colors hover:text-living"
                          aria-label={`Open ${row.crop.name} detail`}
                        >
                          Open
                          <ArrowUpRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <EmptyState
          icon={<Sprout className="h-5 w-5" aria-hidden />}
          title={crops.length === 0 ? "No forecasts yet" : "No crop matches these filters"}
          description={
            crops.length === 0
              ? "Add a crop with a planting date and its estimated harvest window will appear here alongside the others."
              : "Clear the readiness filter or switch back to all farms to see the full comparison."
          }
          action={
            crops.length === 0 ? (
              <Button size="sm" onClick={() => navigate("/app")}>
                <Plus className="h-4 w-4" aria-hidden />
                Add crop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setStatus("all");
                  setFarmFilter(ALL_FARMS);
                  selectFarm(ALL_FARMS);
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
