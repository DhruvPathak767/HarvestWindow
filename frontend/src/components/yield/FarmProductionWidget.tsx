import React, { useEffect, useState } from "react";
import { Scale, TrendingUp, Layers, AlertCircle, ArrowUpRight, ArrowDownRight, Sprout } from "lucide-react";
import { api } from "@/services/api";
import type { FarmProductionSummary } from "@/types";

interface Props {
  farmId?: string;
  farmName?: string;
}

export function FarmProductionWidget({ farmId, farmName }: Props) {
  const [summary, setSummary] = useState<FarmProductionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId || farmId === "all") {
      setSummary(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    api
      .getFarmProductionEstimates(farmId)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load production summary");
          setSummary(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [farmId]);

  if (!farmId || farmId === "all") return null;

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm animate-pulse space-y-4">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !summary || summary.crops.length === 0) {
    return null;
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">
            Farm Production Forecast
          </h3>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {summary.cropsCoveredCount} of {summary.totalCropsCount} Crops Forecasted ({summary.coveragePct}%)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20">
          <div className="text-xs font-medium text-primary">Total Estimated Output</div>
          <div className="text-xl font-black text-primary mt-1">
            {summary.totalEstimatedProductionTonnes.toFixed(1)}{" "}
            <span className="text-xs font-bold">Tonnes</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Across {summary.totalPlantedAreaHectares.toFixed(1)} ha planted
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between">
          <div className="text-xs font-medium text-muted-foreground">Productivity Span</div>
          <div className="space-y-1 mt-1 text-xs">
            {summary.highestYieldCrop && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  Top: {summary.highestYieldCrop.cropName}
                </span>
                <span className="font-bold text-foreground">
                  {summary.highestYieldCrop.predictedYieldTonnesPerHectare.toFixed(1)} t/ha
                </span>
              </div>
            )}
            {summary.lowestYieldCrop && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />
                  Min: {summary.lowestYieldCrop.cropName}
                </span>
                <span className="font-bold text-foreground">
                  {summary.lowestYieldCrop.predictedYieldTonnesPerHectare.toFixed(1)} t/ha
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-1">
        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sprout className="w-3.5 h-3.5" /> Crop Breakdown
        </div>
        <div className="space-y-2">
          {summary.crops.map((c) => (
            <div
              key={c.cropId}
              className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs"
            >
              <div>
                <span className="font-semibold text-foreground">{c.cropName}</span>
                <span className="text-muted-foreground ml-2">
                  ({c.plantedArea.value} {c.plantedArea.unit.toLowerCase()})
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-primary">{c.production.value.toFixed(1)} Tonnes</span>
                <span className="text-muted-foreground text-[11px] ml-2">
                  @{c.yield.value.toFixed(1)} t/ha
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
