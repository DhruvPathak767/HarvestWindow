import { resolveWeatherCode } from "./weather.constants.js";

/**
 * Normalizes and validates provider meteorological records into the HarvestWindow internal schema.
 * All units are standardized:
 * - Temperature: Celsius (°C)
 * - Humidity: percentage (0–100%)
 * - Precipitation probability: percentage (0–100%)
 * - Rainfall: millimeters (mm)
 * - Wind speed: meters per second (m/s) (1 km/h = 1/3.6 m/s)
 * - Wind gust: meters per second (m/s)
 */

export function kmhToMps(kmh) {
  if (kmh === null || kmh === undefined || Number.isNaN(Number(kmh))) return null;
  return Math.round((Number(kmh) / 3.6) * 10) / 10;
}

export function mpsToKmh(mps) {
  if (mps === null || mps === undefined || Number.isNaN(Number(mps))) return null;
  return Math.round((Number(mps) * 3.6) * 10) / 10;
}

export function validateNumeric(value, min, max, fieldName) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (num < min || num > max) {
    console.warn(`[WeatherNormalizer] Field ${fieldName} value ${num} is out of realistic physical bounds [${min}, ${max}].`);
    return null;
  }
  return num;
}

/**
 * Normalizes daily forecast array into internal weather schema.
 *
 * @param {Array<Object>} dailyDays - Provider daily forecast array
 * @param {Object} [meta] - Metadata (source, fetchedAt, timezone)
 * @returns {{ records: Array<Object>, dataQuality: Object }}
 */
export function normalizeDailyForecastRecords(dailyDays, meta = {}) {
  const missingFields = new Set();
  const records = [];

  if (!Array.isArray(dailyDays) || dailyDays.length === 0) {
    return {
      records: [],
      dataQuality: {
        complete: false,
        missingFields: ["dailyForecast"],
        recordCount: 0,
        coverageStart: null,
        coverageEnd: null,
      },
    };
  }

  for (const day of dailyDays) {
    if (!day || typeof day !== "object") continue;

    const dateStr = day.date || (day.time ? String(day.time).slice(0, 10) : null);
    if (!dateStr) continue;

    // Temperature
    const minTempRaw = day.minTempC ?? day.mintemp_c ?? day.minTemperatureC;
    const maxTempRaw = day.maxTempC ?? day.maxtemp_c ?? day.maxTemperatureC;
    const minTempC = validateNumeric(minTempRaw, -50, 60, "minTempC");
    const maxTempC = validateNumeric(maxTempRaw, -50, 60, "maxTempC");

    let meanTempC = null;
    if (minTempC !== null && maxTempC !== null) {
      meanTempC = Math.round(((minTempC + maxTempC) / 2) * 10) / 10;
    } else if (day.tempC !== undefined) {
      meanTempC = validateNumeric(day.tempC, -50, 60, "meanTempC");
    }

    // Rainfall
    const rainRaw = day.rainfallMm ?? day.precipitationMm ?? day.precipitation_sum ?? day.totalprecip_mm ?? 0;
    const rainfallMm = validateNumeric(rainRaw, 0, 1000, "rainfallMm") ?? 0;

    // Precipitation probability
    const rainProbRaw =
      day.precipitationProbabilityMax ??
      day.precipitationProbabilityPercent ??
      day.daily_chance_of_rain ??
      day.rainProbability;
    const precipProb = validateNumeric(rainProbRaw, 0, 100, "precipitationProbabilityPercent");
    if (precipProb === null) missingFields.add("precipitationProbability");

    // Humidity (if available per day, or fallback estimate from current / dew point)
    const humidityRaw = day.humidityPercent ?? day.humidity ?? day.relative_humidity_2m;
    const humidityPercent = validateNumeric(humidityRaw, 0, 100, "humidityPercent");
    if (humidityPercent === null) missingFields.add("humidityPercent");

    // Wind speed: provider could provide maxWindSpeedKmh or maxwind_kph or wind_speed_10m_max
    let windSpeedMps = null;
    let windGustMps = null;
    if (day.maxWindSpeedMps !== undefined) {
      windSpeedMps = validateNumeric(day.maxWindSpeedMps, 0, 150, "maxWindSpeedMps");
    } else if (day.maxWindSpeedKmh !== undefined || day.maxwind_kph !== undefined) {
      const rawKmh = day.maxWindSpeedKmh ?? day.maxwind_kph;
      windSpeedMps = kmhToMps(validateNumeric(rawKmh, 0, 400, "windSpeedKmh"));
    }
    if (windSpeedMps === null) missingFields.add("windSpeed");

    if (day.windGustMps !== undefined) {
      windGustMps = validateNumeric(day.windGustMps, 0, 150, "windGustMps");
    } else if (day.windGustKmh !== undefined || day.gust_kph !== undefined) {
      const rawGustKmh = day.windGustKmh ?? day.gust_kph;
      windGustMps = kmhToMps(validateNumeric(rawGustKmh, 0, 400, "windGustKmh"));
    }

    // Condition
    const weatherCode = day.weatherCode !== undefined ? Number(day.weatherCode) : null;
    const resolved = resolveWeatherCode(weatherCode);
    const weatherCondition = day.condition || resolved.condition || "partly-cloudy";
    const conditionLabel = day.conditionLabel || resolved.label || "Partly cloudy";

    records.push({
      date: dateStr,
      timestamp: `${dateStr}T12:00:00Z`,
      minTempC,
      maxTempC,
      temperatureC: meanTempC,
      humidityPercent,
      precipitationProbabilityPercent: precipProb,
      rainfallMm,
      windSpeedMps,
      windGustMps,
      weatherCondition,
      conditionLabel,
      icon: day.icon || resolved.icon || "cloud-sun",
      cloudCoverPercent: validateNumeric(day.cloudCoverPercent ?? day.cloud, 0, 100, "cloudCoverPercent"),
      sunrise: day.sunrise || null,
      sunset: day.sunset || null,
      dataSource: meta.provider || "Open-Meteo",
      fetchedAt: meta.fetchedAt || new Date().toISOString(),
    });
  }

  const coverageStart = records.length > 0 ? records[0].date : null;
  const coverageEnd = records.length > 0 ? records[records.length - 1].date : null;

  return {
    records,
    dataQuality: {
      complete: missingFields.size === 0,
      missingFields: Array.from(missingFields),
      recordCount: records.length,
      coverageStart: coverageStart ? `${coverageStart}T00:00:00Z` : null,
      coverageEnd: coverageEnd ? `${coverageEnd}T23:59:59Z` : null,
    },
  };
}
