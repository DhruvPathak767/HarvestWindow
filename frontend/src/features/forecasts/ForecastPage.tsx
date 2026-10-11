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
  CloudLightning,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader, EmptyState, StatusBadge } from "@/components/common/ui";
import { SegmentedControl } from "@/components/common/fields";
import { WindowGantt } from "@/components/charts/WindowGantt";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import type { ReadinessStatus, WeatherRiskAssessment } from "@/types";
import { READINESS_META } from "@/types";
import { formatDate, formatDateRange } from "@/utils/date";
import { cn } from "@/utils/cn";
import { api } from "@/services/api";

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
  const [weatherRisks, setWeatherRisks] = useState<Record<string, WeatherRiskAssessment>>({});

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

  useEffect(() => {
    let active = true;
    const loadRisks = async () => {
      const targetFarms =
        effectiveFarmFilter === ALL_FARMS
          ? farms
          : farms.filter((f) => f.id === effectiveFarmFilter);

      const map: Record<string, WeatherRiskAssessment> = {};
      for (const f of targetFarms) {
        if (!f.latitude || !f.longitude) continue;
        try {
          const res = await api.getFarmWeatherRisk(f.id);
          if (res?.crops && Array.isArray(res.crops)) {
            for (const c of res.crops) {
              if (c.cropId) map[c.cropId] = c;
            }
          }
        } catch {
          // ignore error for offline or unmapped farms
        }
      }
      if (active) setWeatherRisks(map);
    };

    void loadRisks();
    return () => {
      active = false;
    };
  }, [effectiveFarmFilter, farms]);

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
          <div className="space-y-4">
            {/* Phase AI-3 Weather Intelligence Advisory Banner if any crops have adverse weather */}
            {(() => {
              const adverseCrops = rows
                .map((r) => ({ row: r, risk: weatherRisks[r.crop.id] }))
                .filter(
                  (item) =>
                    item.risk &&
                    (item.risk.harvestSuitability === "UNFAVORABLE" ||
                      item.risk.harvestSuitability === "CAUTION")
                );

              if (adverseCrops.length === 0) return null;

              return (
                <div className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/70 flex items-start gap-3">
                  <CloudLightning className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-bold text-amber-950 flex items-center gap-2">
                      <span>Weather Intelligence Advisory Active</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                        {adverseCrops.length} {adverseCrops.length === 1 ? "Block" : "Blocks"} Affected
                      </span>
                    </h4>
                    <p className="text-[12px] text-amber-900 leading-relaxed">
                      Upcoming forecast events (rainfall, elevated humidity, or high winds) overlap the harvest windows for{" "}
                      <span className="font-semibold text-amber-950">
                        {adverseCrops.map((c) => c.row.crop.name).join(", ")}
                      </span>
                      . Consult individual crop weather intelligence before dispatching harvest machinery.
                    </p>
                  </div>
                </div>
              );
            })()}

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
          </div>
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
                    {["Crop", "Farm", "Sown", "Estimated window", "Engine Method", "Opens", "Readiness", "Weather Risk", "Inputs"].map(
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
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {formatDateRange(
                              row.forecast.estimatedWindowStart,
                              row.forecast.estimatedWindowEnd
                            )}
                          </span>
                          {row.forecast.weatherAdjustmentApplied ? (
                            <span className="inline-block w-fit rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#8a6415]">
                              Weather {row.forecast.weatherAdjustmentDays && row.forecast.weatherAdjustmentDays > 0 ? `+${row.forecast.weatherAdjustmentDays}d` : `${row.forecast.weatherAdjustmentDays}d`}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                          row.forecast.weatherAdjustmentApplied
                            ? "border border-gold/30 bg-gold/15 text-[#8a6415]"
                            : "border border-forest/20 bg-forest/10 text-forest-deep"
                        )}>
                          {row.forecast.weatherAdjustmentApplied ? "GDD + Weather" : "Agronomic Baseline"}
                        </span>
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
                      <td className="px-4 py-3">
                        {(() => {
                          const wRisk = weatherRisks[row.crop.id];
                          if (!wRisk) {
                            return <span className="text-[11.5px] text-muted font-mono">—</span>;
                          }
                          const suit = wRisk.harvestSuitability;
                          const badgeColor =
                            suit === "FAVORABLE"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : suit === "CAUTION"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : suit === "UNFAVORABLE"
                              ? "bg-red-100 text-red-800 border-red-300"
                              : "bg-slate-100 text-slate-700 border-slate-300";

                          return (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border",
                                badgeColor
                              )}
                            >
                              {suit === "FAVORABLE" ? (
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              ) : suit === "UNFAVORABLE" ? (
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              )}
                              <span>{suit}</span>
                            </span>
                          );
                        })()}
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
