import { useMemo } from "react";
import type { Crop, Farm, Forecast } from "@/types";
import { useStore, type FarmSelection, ALL_FARMS } from "@/store/AppStore";

export interface NextHarvest {
  crop: Crop;
  forecast: Forecast;
  farmName: string;
}

export interface DashboardMetrics {
  activeFields: number;
  approaching: number;
  attention: number;
  inWindow: number;
  nextHarvest: NextHarvest | null;
  trackedArea: number;
  areaUnitLabel: string;
}

/** Aggregates the derived forecasts for one farm (or all farms). */
export function useDashboardMetrics(selection?: FarmSelection): DashboardMetrics {
  const { crops, farms, forecasts, selectedFarmId } = useStore();
  const scope = selection ?? selectedFarmId;

  return useMemo(() => {
    const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "—";
    const scoped = scope === ALL_FARMS ? crops : crops.filter((c) => c.farmId === scope);

    let activeFields = 0;
    let approaching = 0;
    let attention = 0;
    let inWindow = 0;
    let trackedArea = 0;
    let next: NextHarvest | null = null;

    for (const crop of scoped) {
      const forecast = forecasts[crop.id];
      if (!forecast) continue;
      if (forecast.readinessStatus !== "passed") activeFields += 1;
      if (forecast.readinessStatus === "approaching") approaching += 1;
      if (forecast.readinessStatus === "in-window") inWindow += 1;
      if (
        forecast.readinessStatus === "caution" ||
        forecast.readinessStatus === "passed"
      ) {
        attention += 1;
      }
      if (crop.fieldArea) trackedArea += crop.fieldArea;

      const upcoming = forecast.daysToWindowStart >= 0 || forecast.daysToWindowEnd >= 0;
      if (upcoming) {
        const score = Math.max(forecast.daysToWindowStart, 0);
        if (!next || score < Math.max(next.forecast.daysToWindowStart, 0)) {
          next = { crop, forecast, farmName: farmName(crop.farmId) };
        }
      }
    }

    const unit = scoped.length
      ? scoped.every((c) => !c.fieldArea)
        ? "—"
        : "ha"
      : "—";

    return {
      activeFields,
      approaching,
      attention,
      inWindow,
      nextHarvest: next,
      trackedArea: Math.round(trackedArea * 10) / 10,
      areaUnitLabel: unit,
    };
  }, [crops, farms, forecasts, scope]);
}

export function useFarmById(id?: string | null): Farm | null {
  const { farms } = useStore();
  return useMemo(() => farms.find((f) => f.id === id) ?? null, [farms, id]);
}
