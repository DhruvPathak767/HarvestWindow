import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks, Plus, RotateCcw, Sprout } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader, EmptyState } from "@/components/common/ui";
import { SegmentedControl } from "@/components/common/fields";
import { RecommendationCard } from "@/features/recommendations/RecommendationCard";
import { MetricPanel } from "@/features/common/MetricPanel";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import type { Priority, RecommendationStatus } from "@/types";
import { cn } from "@/utils/cn";

type StatusTab = "open" | "completed" | "dismissed" | "all";
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const {
    recommendations,
    crops,
    farms,
    setRecommendationStatus,
    refreshRecommendations,
    selectedFarmId,
  } = useStore();
  const [tab, setTab] = useState<StatusTab>("open");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [cropFilter, setCropFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshRecommendations(selectedFarmId === ALL_FARMS ? undefined : selectedFarmId);
    } finally {
      setRefreshing(false);
    }
  };

  const scoped = useMemo(
    () =>
      recommendations.filter(
        (r) => selectedFarmId === ALL_FARMS || r.farmId === selectedFarmId
      ),
    [recommendations, selectedFarmId]
  );

  const visible = useMemo(
    () =>
      scoped
        .filter((r) => {
          if (tab === "all") return true;
          return r.status === (tab as RecommendationStatus);
        })
        .filter((r) => priority === "all" || r.priority === priority)
        .filter((r) => cropFilter === "all" || r.cropId === cropFilter)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]),
    [scoped, tab, priority, cropFilter]
  );

  const counts = useMemo(() => {
    const base = { open: 0, completed: 0, dismissed: 0, high: 0 };
    for (const r of scoped) {
      if (r.status === "open") base.open += 1;
      if (r.status === "completed") base.completed += 1;
      if (r.status === "dismissed") base.dismissed += 1;
      if (r.priority === "high" && r.status === "open") base.high += 1;
    }
    return base;
  }, [scoped]);

  const clearFilters = () => {
    setPriority("all");
    setCropFilter("all");
    setTab("open");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Recommendations"
        title="What to do next, in order"
        subtitle="Each item names the crop, the reason, and the smallest useful next step. Suggestions stop short of chemical or pesticide prescriptions."
        meta={[
          { label: "Open", value: counts.open },
          { label: "High priority", value: counts.high },
          { label: "Completed", value: counts.completed },
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RotateCcw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" variant="secondary" onClick={clearFilters}>
              Reset filters
            </Button>
            <Button size="sm" onClick={() => navigate("/app")}>
              <Plus className="h-4 w-4" aria-hidden />
              Add crop
            </Button>
          </>
        }
      />

      <section aria-label="Recommendation summary" className="grid gap-4 sm:grid-cols-3">
        <MetricPanel
          label="Open actions"
          value={counts.open}
          icon={<ListChecks className="h-4 w-4" aria-hidden />}
          context="Across the current farm selection."
        />
        <MetricPanel
          label="High priority"
          value={counts.high}
          icon={<Sprout className="h-4 w-4" aria-hidden />}
          tone="caution"
          delay={0.06}
          context={counts.high === 0 ? "Nothing urgent right now." : "Weather or timing sensitive."}
        />
        <MetricPanel
          label="Completed"
          value={counts.completed}
          icon={<RotateCcw className="h-4 w-4" aria-hidden />}
          tone="earth"
          delay={0.12}
          context="Marked done in this workspace."
        />
      </section>

      <Card>
        <CardHeader
          title="Filters"
          subtitle="Filter by status, priority and crop."
          icon={<ListChecks className="h-4 w-4" aria-hidden />}
          action={
            <SegmentedControl<StatusTab>
              ariaLabel="Recommendation status"
              value={tab}
              onChange={setTab}
              options={[
                { value: "open", label: "Open" },
                { value: "completed", label: "Done" },
                { value: "dismissed", label: "Dismissed" },
                { value: "all", label: "All" },
              ]}
            />
          }
        />
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                aria-pressed={priority === p}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                  priority === p
                    ? "border-forest-deep bg-forest-deep text-cream"
                    : "border-line bg-white text-muted hover:border-living hover:text-forest-deep"
                )}
              >
                {p === "all" ? "Any priority" : `${p} priority`}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by crop"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="h-9 rounded-sm border border-line bg-white px-3 text-[13px] font-medium text-forest-deep outline-none focus:border-forest"
          >
            <option value="all">All crops</option>
            {crops
              .filter((c) => scoped.some((r) => r.cropId === c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.variety ? ` · ${c.variety}` : ""}
                </option>
              ))}
          </select>
        </div>
      </Card>

      {visible.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((rec, i) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              crop={crops.find((c) => c.id === rec.cropId)}
              farm={farms.find((f) => f.id === rec.farmId)}
              delay={Math.min(i * 0.05, 0.3)}
              onStatus={(status) => void setRecommendationStatus(rec.id, status)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title={
            scoped.length === 0 ? "No recommendations for this selection" : "Nothing matches these filters"
          }
          description={
            scoped.length === 0
              ? "Recommendations are generated when a window approaches, weather interferes, or a crop record is missing detail."
              : "Try another status tab, or reset the filters to see every open action."
          }
          action={
            <Button size="sm" variant="secondary" onClick={clearFilters}>
              Reset filters
            </Button>
          }
        />
      )}
    </div>
  );
}
