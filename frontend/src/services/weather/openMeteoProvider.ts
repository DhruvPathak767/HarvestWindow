import type { Farm, WeatherCaution, WeatherCondition, WeatherDay, WeatherSummary } from "@/types";
import type { WeatherProvider } from "./weatherTypes";
import { fetchFarmWeatherApi } from "./weatherApi";
import { addDays, startOfToday, toISODate } from "@/utils/date";

function mapCondition(cond: string): WeatherCondition {
  const lower = String(cond || "").toLowerCase();
  if (lower.includes("clear") || lower.includes("sun")) return "clear";
  if (lower.includes("overcast") || lower.includes("cloudy") || lower.includes("fog")) return "overcast";
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("shower")) return "rain";
  if (lower.includes("storm") || lower.includes("thunder") || lower.includes("lightning")) return "storm";
  return "partly-cloudy";
}

function buildPlaceholderSummary(farm: Farm, reasonLabel: string): WeatherSummary {
  const today = startOfToday();
  const daily: WeatherDay[] = Array.from({ length: 10 }, (_, i) => ({
    date: toISODate(addDays(today, i)),
    minTempC: 22,
    maxTempC: 31 - (i % 3),
    rainfallMm: i === 4 ? 6 : 0,
    humidity: 60,
    condition: (i === 4 ? "rain" : i % 2 === 0 ? "partly-cloudy" : "clear") as WeatherCondition,
  }));

  const loc = [farm.village, farm.district, farm.state].filter(Boolean).join(", ") || `${farm.district}, ${farm.state}`;

  return {
    farmId: farm.id,
    locationLabel: loc,
    observedAt: new Date().toISOString(),
    temperatureC: 30,
    feelsLikeC: 32,
    rainfallMm: 0,
    humidity: 60,
    windKph: 12,
    condition: "partly-cloudy",
    forecastSummary: "Neutral baseline pattern. Connect GPS coordinates to view live Open-Meteo forecasts.",
    daily,
    cautions: [],
    sourceType: "demo-dataset",
    sourceLabel: reasonLabel,
  };
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly id = "open-meteo-api";
  readonly label = "Open-Meteo Live Meteorological Service";
  readonly sourceType = "live-provider" as const;

  async fetchForFarm(farm: Farm, forceRefresh = false): Promise<WeatherSummary> {
    // If farm doesn't have coordinates yet, return placeholder with guidance
    if (farm.latitude === null || farm.longitude === null || farm.latitude === undefined || farm.longitude === undefined) {
      return buildPlaceholderSummary(
        farm,
        "Awaiting GPS coordinates · Add latitude/longitude to activate live Open-Meteo feed"
      );
    }

    try {
      const data = await fetchFarmWeatherApi(farm.id, forceRefresh);
      if (!data || !data.current || !data.dailyForecast || !Array.isArray(data.dailyForecast)) {
        throw new Error("Invalid weather payload received from backend");
      }

      const daily: WeatherDay[] = data.dailyForecast.map((d: any) => ({
        date: String(d.date || ""),
        minTempC: typeof d.minTempC === "number" ? d.minTempC : 20,
        maxTempC: typeof d.maxTempC === "number" ? d.maxTempC : 30,
        rainfallMm: typeof d.rainfallMm === "number" ? d.rainfallMm : (typeof d.precipitationMm === "number" ? d.precipitationMm : 0),
        humidity: typeof d.humidityPercent === "number" ? d.humidityPercent : (d.rainfallMm > 5 ? 78 : 55),
        condition: mapCondition(d.condition),
      }));

      const cautions: WeatherCaution[] = Array.isArray(data.warnings)
        ? data.warnings.map((w: any) => ({
            id: String(w.id || Math.random()),
            level: w.severity === "HIGH" ? "caution" : w.severity === "MEDIUM" ? "watch" : "advisory",
            title: String(w.title || "Weather alert"),
            detail: String(w.message || ""),
            dates: String(w.date || ""),
          }))
        : [];

      const locationDetails = [farm.village, farm.district, farm.state].filter(Boolean).join(", ");
      const observedAt = data.current.observedAt ? new Date(data.current.observedAt).toISOString() : new Date().toISOString();

      return {
        farmId: farm.id,
        locationLabel: locationDetails || `${farm.district}, ${farm.state}`,
        observedAt,
        temperatureC: typeof data.current.temperatureC === "number" ? data.current.temperatureC : 28,
        feelsLikeC: typeof data.current.feelsLikeC === "number" ? data.current.feelsLikeC : (data.current.temperatureC || 28),
        rainfallMm: typeof data.current.precipitationMm === "number" ? data.current.precipitationMm : 0,
        humidity: typeof data.current.humidityPercent === "number" ? data.current.humidityPercent : 60,
        windKph: typeof data.current.windSpeedKmh === "number" ? data.current.windSpeedKmh : 10,
        condition: mapCondition(data.current.condition),
        forecastSummary:
          cautions.length > 0
            ? `${cautions.length} weather caution(s) flagged for harvesting operations: ${cautions[0]?.title}.`
            : "Favorable conditions over the 10-day forecast period with no severe weather warnings.",
        daily,
        cautions,
        sourceType: "live-provider",
        sourceLabel: `${data.provider || "Live meteorological feed"} · ${data.timezone || "Local grid"}${data.isCached ? " (cached)" : ""}`,
      };
    } catch (err: unknown) {
      console.warn(`[OpenMeteoProvider] Falling back to baseline dataset for ${farm.name}:`, err);
      return buildPlaceholderSummary(
        farm,
        `Demo baseline (${err instanceof Error ? err.message : "Live weather offline"})`
      );
    }
  }
}

export const openMeteoWeatherProvider = new OpenMeteoWeatherProvider();
