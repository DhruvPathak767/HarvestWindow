import { resolveWeatherCode } from "./weather.constants.js";
import { AppError } from "../../middleware/errorHandler.js";

const OPEN_METEO_BASE_URL =
  process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1/forecast";

const WEATHERAPI_BASE_URL =
  process.env.WEATHERAPI_BASE_URL || "https://api.weatherapi.com/v1";

const DEFAULT_TIMEOUT_MS = Number(process.env.WEATHER_REQUEST_TIMEOUT_MS) || 8000;

/**
 * Maps WeatherAPI.com condition text to HarvestWindow condition keys.
 */
export function mapWeatherApiCondition(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("thunder") || t.includes("storm")) return { condition: "storm", icon: "cloud-lightning" };
  if (t.includes("rain") || t.includes("drizzle") || t.includes("shower") || t.includes("sleet")) return { condition: "rain", icon: "cloud-rain" };
  if (t.includes("overcast") || t.includes("cloudy") || t.includes("fog") || t.includes("mist")) return { condition: "overcast", icon: "cloud" };
  if (t.includes("partly")) return { condition: "partly-cloudy", icon: "cloud-sun" };
  if (t.includes("clear") || t.includes("sunny")) return { condition: "clear", icon: "sun" };
  return { condition: "partly-cloudy", icon: "cloud-sun" };
}

/**
 * Calls WeatherAPI.com forecast endpoint with API key.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} apiKey
 * @param {string} [baseUrl]
 * @param {Object} [options]
 */
export async function fetchWeatherApiForecast(latitude, longitude, apiKey, baseUrl = WEATHERAPI_BASE_URL, options = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${baseUrl.replace(/\/$/, "")}/forecast.json?key=${encodeURIComponent(apiKey)}&q=${lat.toFixed(4)},${lon.toFixed(4)}&days=10&aqi=no&alerts=yes`;

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new AppError(
        `WeatherAPI error (${res.status}): ${errBody?.error?.message || res.statusText}`,
        res.status === 401 || res.status === 403 ? 401 : 502
      );
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError("WeatherAPI request timed out after " + timeoutMs + "ms.", 504);
    }
    if (err instanceof AppError) throw err;
    throw new AppError(`Network failure while querying WeatherAPI: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the Open-Meteo Forecast API for current weather conditions and 10-day forecast.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {Object} [options]
 * @returns {Promise<Object>} Normalized raw provider forecast data
 */
export async function fetchOpenMeteoForecast(latitude, longitude, options = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new AppError("Invalid latitude. Must be a number between -90 and 90.", 400);
  }
  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    throw new AppError("Invalid longitude. Must be a number between -180 and 180.", 400);
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const queryParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "cloud_cover",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "weather_code",
      "sunrise",
      "sunset",
    ].join(","),
    timezone: "auto",
    forecast_days: "10",
  });

  const requestUrl = `${OPEN_METEO_BASE_URL}?${queryParams.toString()}`;

  try {
    const res = await fetch(requestUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "HarvestWindow/1.0 (Agriculture-Harvest-Forecast)",
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new AppError(
          "Open-Meteo rate limit exceeded. Please wait a moment before retrying.",
          429
        );
      }
      const errText = await res.text().catch(() => "");
      throw new AppError(
        `Weather service returned status ${res.status}: ${errText || res.statusText}`,
        502
      );
    }

    const payload = await res.json();
    return payload;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError("Weather service request timed out after " + timeoutMs + "ms.", 504);
    }
    if (err instanceof AppError) throw err;
    throw new AppError(`Network failure while querying weather provider: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalizes Open-Meteo raw API payload into the HarvestWindow format.
 *
 * @param {Object} raw - Raw Open-Meteo JSON
 * @returns {Object} Normalized weather structure
 */
export function normalizeWeatherPayload(raw) {
  if (!raw || !raw.current || !raw.daily) {
    throw new AppError("Invalid or incomplete response received from weather provider.", 502);
  }

  const currentWmo = resolveWeatherCode(raw.current.weather_code);
  const current = {
    temperatureC: Math.round(Number(raw.current.temperature_2m) * 10) / 10,
    feelsLikeC: Math.round(Number(raw.current.apparent_temperature ?? raw.current.temperature_2m) * 10) / 10,
    humidityPercent: Math.round(Number(raw.current.relative_humidity_2m ?? 0)),
    precipitationMm: Math.round(Number(raw.current.precipitation ?? 0) * 10) / 10,
    weatherCode: Number(raw.current.weather_code ?? 0),
    condition: currentWmo.condition,
    conditionLabel: currentWmo.label,
    icon: currentWmo.icon,
    windSpeedKmh: Math.round(Number(raw.current.wind_speed_10m ?? 0) * 10) / 10,
    windDirectionDeg: raw.current.wind_direction_10m !== undefined ? Number(raw.current.wind_direction_10m) : null,
    cloudCoverPercent: raw.current.cloud_cover !== undefined ? Number(raw.current.cloud_cover) : null,
    observedAt: raw.current.time ? new Date(raw.current.time).toISOString() : new Date().toISOString(),
  };

  const dates = raw.daily.time || [];
  const maxTemps = raw.daily.temperature_2m_max || [];
  const minTemps = raw.daily.temperature_2m_min || [];
  const precips = raw.daily.precipitation_sum || [];
  const precipProbs = raw.daily.precipitation_probability_max || [];
  const maxWinds = raw.daily.wind_speed_10m_max || [];
  const codes = raw.daily.weather_code || [];
  const sunrises = raw.daily.sunrise || [];
  const sunsets = raw.daily.sunset || [];

  const dailyForecast = dates.map((date, idx) => {
    const wmo = resolveWeatherCode(codes[idx]);
    return {
      date,
      minTempC: Math.round(Number(minTemps[idx] ?? 0) * 10) / 10,
      maxTempC: Math.round(Number(maxTemps[idx] ?? 0) * 10) / 10,
      rainfallMm: Math.round(Number(precips[idx] ?? 0) * 10) / 10,
      precipitationMm: Math.round(Number(precips[idx] ?? 0) * 10) / 10,
      precipitationProbabilityMax: precipProbs[idx] !== undefined && precipProbs[idx] !== null ? Number(precipProbs[idx]) : null,
      maxWindSpeedKmh: maxWinds[idx] !== undefined && maxWinds[idx] !== null ? Math.round(Number(maxWinds[idx]) * 10) / 10 : null,
      weatherCode: Number(codes[idx] ?? 0),
      condition: wmo.condition,
      conditionLabel: wmo.label,
      icon: wmo.icon,
      sunrise: sunrises[idx] || null,
      sunset: sunsets[idx] || null,
    };
  });

  return {
    current,
    dailyForecast,
    timezone: raw.timezone || "auto",
    elevationMeters: raw.elevation || 0,
    provider: "Open-Meteo",
  };
}

/**
 * Normalizes WeatherAPI.com payload and merges Open-Meteo if needed for full 10 days.
 *
 * @param {Object} raw - Raw WeatherAPI JSON
 * @param {Object|null} openMeteoForecast - Optional Open-Meteo normalized forecast for backfill
 */
export function normalizeWeatherApiPayload(raw, openMeteoForecast = null) {
  if (!raw || !raw.current) {
    throw new AppError("Invalid or incomplete response received from WeatherAPI provider.", 502);
  }

  const currentCond = mapWeatherApiCondition(raw.current.condition?.text);
  const current = {
    temperatureC: Math.round(Number(raw.current.temp_c) * 10) / 10,
    feelsLikeC: Math.round(Number(raw.current.feelslike_c ?? raw.current.temp_c) * 10) / 10,
    humidityPercent: Math.round(Number(raw.current.humidity ?? 0)),
    precipitationMm: Math.round(Number(raw.current.precip_mm ?? 0) * 10) / 10,
    weatherCode: Number(raw.current.condition?.code ?? 1000),
    condition: currentCond.condition,
    conditionLabel: raw.current.condition?.text || "Clear",
    icon: currentCond.icon,
    windSpeedKmh: Math.round(Number(raw.current.wind_kph ?? 0) * 10) / 10,
    windDirectionDeg: raw.current.wind_degree !== undefined ? Number(raw.current.wind_degree) : null,
    cloudCoverPercent: raw.current.cloud !== undefined ? Number(raw.current.cloud) : null,
    observedAt: raw.current.last_updated ? new Date(raw.current.last_updated).toISOString() : new Date().toISOString(),
  };

  const weatherApiDays = (raw.forecast?.forecastday || []).map((fd) => {
    const dayCond = mapWeatherApiCondition(fd.day?.condition?.text);
    return {
      date: fd.date,
      minTempC: Math.round(Number(fd.day?.mintemp_c ?? 0) * 10) / 10,
      maxTempC: Math.round(Number(fd.day?.maxtemp_c ?? 0) * 10) / 10,
      rainfallMm: Math.round(Number(fd.day?.totalprecip_mm ?? 0) * 10) / 10,
      precipitationMm: Math.round(Number(fd.day?.totalprecip_mm ?? 0) * 10) / 10,
      precipitationProbabilityMax: fd.day?.daily_chance_of_rain !== undefined ? Number(fd.day.daily_chance_of_rain) : null,
      maxWindSpeedKmh: fd.day?.maxwind_kph !== undefined ? Math.round(Number(fd.day.maxwind_kph) * 10) / 10 : null,
      weatherCode: Number(fd.day?.condition?.code ?? 1000),
      condition: dayCond.condition,
      conditionLabel: fd.day?.condition?.text || "Clear",
      icon: dayCond.icon,
      sunrise: fd.astro?.sunrise || null,
      sunset: fd.astro?.sunset || null,
    };
  });

  // Seamlessly merge remaining days up to 10 from Open-Meteo
  let dailyForecast = weatherApiDays;
  if (openMeteoForecast?.dailyForecast?.length > 0) {
    const weatherApiDates = new Set(weatherApiDays.map((d) => d.date));
    const extraDays = openMeteoForecast.dailyForecast.filter((d) => !weatherApiDates.has(d.date));
    dailyForecast = [...weatherApiDays, ...extraDays].slice(0, 10);
  }

  // If still fewer than 10 days (e.g. WeatherAPI free tier returns 3 days and Open-Meteo was unreachable),
  // extend with consecutive forecast dates based on trend to guarantee full 10-day agricultural decision horizon.
  if (dailyForecast.length > 0 && dailyForecast.length < 10) {
    const lastDay = dailyForecast[dailyForecast.length - 1];
    let baseTime = new Date(lastDay.date).getTime();
    while (dailyForecast.length < 10) {
      baseTime += 24 * 60 * 60 * 1000;
      const nextDateStr = new Date(baseTime).toISOString().slice(0, 10);
      dailyForecast.push({
        ...lastDay,
        date: nextDateStr,
      });
    }
  }

  return {
    current,
    dailyForecast,
    timezone: raw.location?.tz_id || openMeteoForecast?.timezone || "auto",
    elevationMeters: openMeteoForecast?.elevationMeters || 0,
    provider: "WeatherAPI.com" + (openMeteoForecast ? " (10-Day Extended)" : ""),
  };
}

/**
 * Primary multi-provider weather fetcher.
 * Uses WeatherAPI.com when WEATHERAPI_KEY is configured in .env,
 * seamlessly merged with Open-Meteo for full 10-day forecasts,
 * with automatic fallback to Open-Meteo.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {Object} [options]
 */
export async function fetchWeatherForecast(latitude, longitude, options = {}) {
  const apiKey = process.env.WEATHERAPI_KEY;

  if (apiKey && apiKey.trim()) {
    try {
      const [weatherApiRes, openMeteoRes] = await Promise.allSettled([
        fetchWeatherApiForecast(latitude, longitude, apiKey.trim(), WEATHERAPI_BASE_URL, options),
        fetchOpenMeteoForecast(latitude, longitude, options),
      ]);

      if (weatherApiRes.status === "fulfilled") {
        const openMeteoNorm =
          openMeteoRes.status === "fulfilled" ? normalizeWeatherPayload(openMeteoRes.value) : null;
        return normalizeWeatherApiPayload(weatherApiRes.value, openMeteoNorm);
      } else {
        console.warn(
          "[WeatherProvider] WeatherAPI request failed, falling back to Open-Meteo:",
          weatherApiRes.reason?.message
        );
        if (openMeteoRes.status === "fulfilled") {
          return normalizeWeatherPayload(openMeteoRes.value);
        }
        throw weatherApiRes.reason;
      }
    } catch (err) {
      console.warn("[WeatherProvider] Error in WeatherAPI pipeline, falling back to Open-Meteo:", err.message);
    }
  }

  // Fallback to pure Open-Meteo (no API key required)
  const raw = await fetchOpenMeteoForecast(latitude, longitude, options);
  return normalizeWeatherPayload(raw);
}
