import type {
  ContributingFactor,
  Crop,
  Forecast,
  GrowthStagePoint,
  ReadinessStatus,
  WeatherSummary,
} from "@/types";
import { STAGE_TEMPLATES, READINESS_META } from "@/types";
import { findCatalogEntry } from "@/data/mock/cropCatalog";
import {
  addDays,
  clamp,
  daysBetween,
  formatDate,
  startOfToday,
  toDate,
  toISODate,
} from "@/utils/date";

/**
 * HarvestWindow demo forecast engine.
 *
 * This is a transparent, rule-based reference engine that runs in the browser.
 * It combines: the recorded planting date + published typical duration ranges
 * for the crop + the demo weather dataset for the farm.
 *
 * It is NOT a trained model, satellite product or sensor feed, and every
 * forecast it returns says so explicitly through `sourceType` and `modelNote`.
 */

const FALLBACK_RANGE: [number, number] = [110, 140];

/** Cumulative season boundaries per stage template (0 = sowing, 1 = window opens). */
const TEMPLATE_BOUNDARIES: Record<keyof typeof STAGE_TEMPLATES, number[]> = {
  cerealGrain: [0, 0.07, 0.26, 0.4, 0.5, 0.76, 0.92, 1],
  wheat: [0, 0.06, 0.2, 0.36, 0.5, 0.74, 0.92, 1],
  fruitingVegetable: [0, 0.08, 0.28, 0.42, 0.56, 0.78, 1],
  fibre: [0, 0.07, 0.24, 0.4, 0.55, 0.75, 1],
  pod: [0, 0.08, 0.3, 0.45, 0.6, 0.82, 1],
  cane: [0, 0.05, 0.16, 0.4, 0.64, 0.86, 1],
};

export const MODEL_NOTE =
  "Demo estimate from the in-browser reference engine: recorded planting date + typical crop duration ranges + the demo weather dataset. No live prediction model, satellite feed or sensor network is connected.";

interface WeatherSignal {
  rainDelayDays: number;
  rainTotalMm: number;
  heatAdvanceDays: number;
  hotDays: number;
  rainInWindow: boolean;
  cautionTitle?: string;
}

function readWeatherSignal(
  weather: WeatherSummary | null | undefined,
  windowStart: Date,
  windowEnd: Date
): WeatherSignal | null {
  if (!weather || weather.daily.length === 0) return null;

  const rangeStart = addDays(windowStart, -3);
  const rangeEnd = addDays(windowEnd, 3);
  const relevant = weather.daily.filter((d) => {
    const day = toDate(d.date);
    return day >= rangeStart && day <= rangeEnd;
  });

  const heavyRainDays = weather.daily.filter((d) => d.rainfallMm >= 15).length;
  const rainTotalMm = weather.daily.reduce((sum, d) => sum + d.rainfallMm, 0);
  const hotDays = weather.daily.filter((d) => d.maxTempC >= 35).length;
  const rainInWindow = relevant.some((d) => d.rainfallMm >= 10);

  const topCaution = weather.cautions.find((c) => c.level === "caution");

  return {
    rainDelayDays: clamp(heavyRainDays, 0, 3),
    rainTotalMm: Math.round(rainTotalMm),
    heatAdvanceDays: clamp(Math.floor(hotDays / 2), 0, 2),
    hotDays,
    rainInWindow,
    cautionTitle: topCaution?.title,
  };
}

function resolveStatus(
  daysToStart: number,
  daysToEnd: number,
  weather: WeatherSignal | null
): ReadinessStatus {
  if (daysToEnd < 0) return "passed";
  if (daysToStart <= 0 && daysToEnd >= 0) {
    return weather?.rainInWindow ? "caution" : "in-window";
  }
  if (daysToStart <= 21) {
    return weather && weather.rainInWindow ? "caution" : "approaching";
  }
  return "growing";
}

function buildStagePlan(
  crop: Crop,
  templateName: keyof typeof STAGE_TEMPLATES,
  windowStart: Date,
  windowEnd: Date
): GrowthStagePoint[] {
  const stages = STAGE_TEMPLATES[templateName] as readonly string[];
  const boundaries = TEMPLATE_BOUNDARIES[templateName];
  const planted = toDate(crop.plantingDate);
  const preWindowDays = Math.max(daysBetween(planted, windowStart), stages.length * 3);
  const today = startOfToday();
  const points: GrowthStagePoint[] = stages.map((stage, i) => {
    const startDate = addDays(planted, Math.round(boundaries[i] * preWindowDays));
    const endDate = addDays(planted, Math.round(boundaries[i + 1] * preWindowDays));
    return {
      stage,
      startDate: toISODate(startDate),
      endDate: toISODate(endDate),
      observed: endDate.getTime() <= today.getTime(),
      shareOfSeason: boundaries[i + 1] - boundaries[i],
    };
  });

  points.push({
    stage: "Estimated harvest window",
    startDate: toISODate(windowStart),
    endDate: toISODate(windowEnd),
    observed: false,
    shareOfSeason: 0,
  });

  return points;
}

function resolveConfidence(crop: Crop, weather: WeatherSummary | null): number {
  let score = 58;
  if (crop.variety?.trim()) score += 8;
  if (weather) score += 10;
  if (crop.fieldArea && crop.fieldArea > 0) score += 4;
  if (crop.growthStage?.trim()) score += 6;
  if (crop.irrigation) score += 3;
  const age = daysBetween(crop.plantingDate, startOfToday());
  score += age > 60 ? 5 : age > 21 ? 3 : 0;
  return clamp(Math.round(score), 40, 92);
}

function nextActionFor(status: ReadinessStatus, crop: Crop, start: Date): string {
  switch (status) {
    case "growing":
      return `Log the next growth-stage observation for ${crop.name} to firm up the estimate.`;
    case "approaching":
      return `Arrange labour, drying space and buyer contact before ${formatDate(start)}.`;
    case "in-window":
      return `Inspect ${crop.variety ? crop.variety : crop.name} in the field today and confirm a harvest date.`;
    case "caution":
      return "Hold scheduling until the wet spell clears, then re-check readiness in the field.";
    case "passed":
      return "Review the block, then mark the crop harvested or archive the record.";
    default:
      return "Review the crop record.";
  }
}

export function computeForecast(
  crop: Crop,
  weather: WeatherSummary | null = null
): Forecast {
  const entry = findCatalogEntry(crop.name);
  const [minDays, maxDays] = entry?.durationRange ?? FALLBACK_RANGE;
  const templateName = entry?.stageTemplateName ?? "cerealGrain";
  const planted = toDate(crop.plantingDate);

  const baseStart = addDays(planted, minDays);
  const baseEnd = addDays(planted, Math.max(maxDays, minDays + 7));

  const signal = readWeatherSignal(weather, baseStart, baseEnd);
  const heatBack = signal ? -signal.heatAdvanceDays : 0;
  const rainPush = signal ? signal.rainDelayDays : 0;

  const windowStart = addDays(baseStart, heatBack);
  let windowEnd = addDays(baseEnd, heatBack + rainPush);
  if (windowEnd.getTime() < windowStart.getTime()) windowEnd = windowStart;

  const today = startOfToday();
  const daysToWindowStart = daysBetween(today, windowStart);
  const daysToWindowEnd = daysBetween(today, windowEnd);
  const totalSeasonDays = Math.max(daysBetween(planted, windowEnd), 1);
  const seasonProgress = clamp(daysBetween(planted, today) / totalSeasonDays, 0, 1);

  const readinessStatus = resolveStatus(daysToWindowStart, daysToWindowEnd, signal);

  const factors: ContributingFactor[] = [
    {
      label: "Recorded planting date",
      detail: `Sowing recorded on ${formatDate(crop.plantingDate)} anchors the whole estimate.`,
      direction: "supports",
      weight: "high",
    },
    {
      label: `${entry?.name ?? crop.name} reference duration`,
      detail: `Typical range of ${minDays}–${maxDays} days from sowing to the opening of the harvest window.`,
      direction: "supports",
      weight: "high",
    },
  ];

  if (crop.variety?.trim()) {
    factors.push({
      label: `Variety: ${crop.variety}`,
      detail: "Variety narrows the reference duration used for this block.",
      direction: "supports",
      weight: "medium",
    });
  }

  if (signal) {
    if (signal.rainDelayDays > 0) {
      factors.push({
        label: `Rainfall in the demo forecast (${signal.rainTotalMm} mm)`,
        detail: `Heavy-rain days pushed the estimated window end back by ${signal.rainDelayDays} day${
          signal.rainDelayDays === 1 ? "" : "s"
        }.`,
        direction: "delays",
        weight: signal.rainInWindow ? "high" : "medium",
      });
    }
    if (signal.heatAdvanceDays > 0) {
      factors.push({
        label: `Warm spell (${signal.hotDays} days above 35 °C)`,
        detail: `Higher temperatures pulled the window forward by about ${signal.heatAdvanceDays} day${
          signal.heatAdvanceDays === 1 ? "" : "s"
        }.`,
        direction: "advances",
        weight: "medium",
      });
    }
    if (signal.rainDelayDays === 0 && signal.heatAdvanceDays === 0) {
      factors.push({
        label: "Weather context: no strong signal",
        detail:
          "The demo dataset shows nothing that would materially move this window in the next 10 days.",
        direction: "neutral",
        weight: "low",
      });
    }
  } else {
    factors.push({
      label: "Weather context unavailable",
      detail:
        "No weather dataset is attached to this farm yet, so the estimate uses crop reference data only.",
      direction: "neutral",
      weight: "medium",
    });
  }

  if (crop.irrigation === "rainfed") {
    factors.push({
      label: "Rainfed block",
      detail: "Rainfed crops track rainfall more closely, so the window is held wider.",
      direction: "delays",
      weight: "medium",
    });
  } else if (crop.irrigation === "irrigated") {
    factors.push({
      label: "Irrigated block",
      detail: "Irrigation reduces dependence on rainfall timing for maturity.",
      direction: "supports",
      weight: "low",
    });
  }

  if (crop.growthStage?.trim()) {
    factors.push({
      label: `Field stage noted: ${crop.growthStage}`,
      detail: "A recorded stage observation supports the reference timeline.",
      direction: "supports",
      weight: "medium",
    });
  }

  const confidence = resolveConfidence(crop, weather);
  if (confidence < 70) {
    factors.push({
      label: "Limited crop detail on record",
      detail:
        "Adding variety, field area and a stage observation would raise the completeness of this estimate.",
      direction: "neutral",
      weight: "low",
    });
  }

  const weatherNote = signal?.cautionTitle
    ? signal.cautionTitle
    : weather
      ? weather.forecastSummary
      : "Weather dataset not available for this farm.";

  return {
    id: `fc-${crop.id}`,
    cropId: crop.id,
    estimatedWindowStart: toISODate(windowStart),
    estimatedWindowEnd: toISODate(windowEnd),
    readinessStatus,
    confidence,
    contributingFactors: factors,
    stagePlan: buildStagePlan(crop, templateName, windowStart, windowEnd),
    seasonProgress,
    daysToWindowStart,
    daysToWindowEnd,
    weatherNote,
    nextAction: nextActionFor(readinessStatus, crop, windowStart),
    updatedAt: new Date().toISOString(),
    sourceType: "rule-based-demo",
    modelNote: MODEL_NOTE,
  };
}

export function computeForecasts(
  crops: Crop[],
  weatherByFarm: Record<string, WeatherSummary | null>
): Record<string, Forecast> {
  const out: Record<string, Forecast> = {};
  for (const crop of crops) {
    out[crop.id] = computeForecast(crop, weatherByFarm[crop.farmId] ?? null);
  }
  return out;
}

export const readinessLabel = (status: ReadinessStatus) => READINESS_META[status].label;
