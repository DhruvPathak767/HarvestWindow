import type { Farm, WeatherCaution, WeatherDay, WeatherSummary } from "@/types";
import { WEATHER_PATTERNS } from "@/data/mock/seed";
import { addDays, startOfToday, toISODate } from "@/utils/date";
import type { WeatherProvider } from "./weatherTypes";
import { openMeteoWeatherProvider } from "./openMeteoProvider";

export type { WeatherProvider };

const NEUTRAL_PATTERN = {
  current: {
    temperatureC: 30,
    feelsLikeC: 32,
    humidity: 60,
    windKph: 10,
    rainfallMm: 0,
    condition: "partly-cloudy" as const,
    observedHoursAgo: 4,
  },
  summary:
    "No location-specific dataset has been attached to this farm yet. Values shown are neutral demo placeholders.",
  daily: Array.from({ length: 10 }, (_, i) => ({
    minTempC: 23,
    maxTempC: 32 - (i % 3),
    rainfallMm: i === 4 ? 6 : 0,
    humidity: 62,
    condition: (i === 4 ? "rain" : i % 3 === 0 ? "partly-cloudy" : "clear") as
      | "rain"
      | "partly-cloudy"
      | "clear",
  })),
  cautions: [] as WeatherCaution[],
};

export class DemoWeatherProvider implements WeatherProvider {
  readonly id = "demo-dataset";
  readonly label = "HarvestWindow demo dataset";
  readonly sourceType = "demo-dataset" as const;

  async fetchForFarm(farm: Farm): Promise<WeatherSummary> {
    return this.buildForFarm(farm);
  }

  /** Synchronous build so the dashboard can render without an extra round-trip. */
  buildForFarm(farm: Farm): WeatherSummary {
    if (!farm) {
      return {
        farmId: "unknown",
        locationLabel: "Farm Location",
        observedAt: new Date().toISOString(),
        temperatureC: 30,
        feelsLikeC: 32,
        rainfallMm: 0,
        humidity: 60,
        windKph: 10,
        condition: "partly-cloudy",
        forecastSummary: "Baseline dataset.",
        daily: [],
        cautions: [],
        sourceType: "demo-dataset",
        sourceLabel: "Demo baseline",
      };
    }

    const pattern = WEATHER_PATTERNS.find((p) => p.farmId === farm.id);
    const today = startOfToday();
    const base = pattern ?? NEUTRAL_PATTERN;

    const daily: WeatherDay[] = base.daily.map((d, i) => ({
      date: toISODate(addDays(today, i)),
      minTempC: d.minTempC,
      maxTempC: d.maxTempC,
      rainfallMm: d.rainfallMm,
      humidity: d.humidity,
      condition: d.condition,
    }));

    const cautions: WeatherCaution[] = (pattern?.cautions ?? []).map((c) => ({
      id: c.id,
      level: c.level,
      title: c.title,
      detail: c.detail,
      dates: `${toISODate(addDays(today, c.dayOffsets[0]))} → ${toISODate(
        addDays(today, c.dayOffsets[1])
      )}`,
    }));

    return {
      farmId: farm.id,
      locationLabel: pattern?.locationLabel ?? `${farm.district || "Farm"}, ${farm.state || "Region"}`,
      observedAt: new Date(Date.now() - base.current.observedHoursAgo * 3_600_000).toISOString(),
      temperatureC: base.current.temperatureC,
      feelsLikeC: base.current.feelsLikeC,
      rainfallMm: base.current.rainfallMm,
      humidity: base.current.humidity,
      windKph: base.current.windKph,
      condition: base.current.condition,
      forecastSummary: base.summary,
      daily,
      cautions,
      sourceType: "demo-dataset",
      sourceLabel: pattern
        ? "Demo dataset · regional seasonal pattern"
        : "Demo dataset · neutral placeholder (no farm pattern on record)",
    };
  }
}

export const demoWeatherProvider = new DemoWeatherProvider();

let activeProvider: WeatherProvider = openMeteoWeatherProvider;

export const weatherService = {
  get provider(): WeatherProvider {
    return activeProvider;
  },
  /** Swap in a real provider (e.g. an API-backed implementation) at runtime. */
  register(provider: WeatherProvider) {
    activeProvider = provider;
  },
  fetchForFarm(farm: Farm): Promise<WeatherSummary> {
    return activeProvider.fetchForFarm(farm);
  },
  /** Demo datasets are cheap enough to build synchronously for the shell. */
  snapshotForFarm(farm: Farm): WeatherSummary {
    return demoWeatherProvider.buildForFarm(farm);
  },
};

export const CONDITION_LABEL: Record<WeatherSummary["condition"], string> = {
  clear: "Clear",
  "partly-cloudy": "Partly cloudy",
  overcast: "Overcast",
  rain: "Rain",
  storm: "Thunderstorm",
};
