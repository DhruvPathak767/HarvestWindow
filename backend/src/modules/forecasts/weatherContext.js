/**
 * HarvestWindow Weather Context Interface & Validator
 *
 * Bridges Phase 4 Weather Integration with Phase 5 Harvest Window Prediction Engine.
 * Extracts, validates, and standardizes meteorological evidence for agronomic prediction adjustments.
 */

const MAX_STALE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validates and normalizes Phase 4 weather output into a structured WeatherContext.
 *
 * @param {Object} rawWeather - Response object from Phase 4 getWeatherForFarm
 * @returns {Object} Normalized, validated WeatherContext
 */
export function buildWeatherContext(rawWeather) {
  if (!rawWeather || typeof rawWeather !== "object") {
    return {
      available: false,
      reason: "NO_WEATHER_DATA",
      weatherFactors: [
        {
          id: "WEATHER_DATA_UNAVAILABLE",
          label: "Weather dataset unavailable",
          detail: "Baseline agronomic reference model active. No meteorological observations attached.",
          direction: "neutral",
          weight: "low",
        },
      ],
    };
  }

  const { farm, current, dailyForecast, warnings, timezone, provider, fetchedAt } = rawWeather;

  // 1. Validate farm location coordinates
  const lat = farm && farm.latitude !== null && farm.latitude !== undefined ? Number(farm.latitude) : null;
  const lon = farm && farm.longitude !== null && farm.longitude !== undefined ? Number(farm.longitude) : null;

  if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
    return {
      available: false,
      reason: "MISSING_COORDINATES",
      weatherFactors: [
        {
          id: "FARM_COORDINATES_MISSING",
          label: "Farm coordinates unassigned",
          detail: "Farm latitude and longitude are required to attach local meteorological models.",
          direction: "neutral",
          weight: "low",
        },
      ],
    };
  }

  // 2. Validate freshness
  const fetchedTime = fetchedAt ? new Date(fetchedAt).getTime() : NaN;
  const now = Date.now();
  const isStale = isNaN(fetchedTime) || now - fetchedTime > MAX_STALE_AGE_MS;

  // 3. Validate daily forecast array
  if (!Array.isArray(dailyForecast) || dailyForecast.length === 0) {
    return {
      available: false,
      reason: "EMPTY_FORECAST_DATA",
      isStale,
      weatherFactors: [
        {
          id: "FORECAST_COVERAGE_LIMITED",
          label: "Incomplete forecast data",
          detail: "Daily weather series is empty or missing from provider response.",
          direction: "neutral",
          weight: "low",
        },
      ],
    };
  }

  // 4. Extract and validate daily metrics
  let totalRainfallMm = 0;
  let maxDailyRainfallMm = 0;
  let rainyDaysCount = 0;
  let currentRainStreak = 0;
  let maxConsecutiveRainDays = 0;
  let peakMaxTempC = -Infinity;
  let lowestMinTempC = Infinity;
  let heatwaveDaysCount = 0;
  let frostRiskDaysCount = 0;
  let tempSum = 0;
  let validTempDays = 0;

  const validatedDaily = [];

  for (const day of dailyForecast) {
    if (!day || typeof day !== "object" || !day.date) continue;

    const minT = Number(day.minTempC ?? day.minTemperatureC);
    const maxT = Number(day.maxTempC ?? day.maxTemperatureC);
    const rain = Number(day.precipitationMm ?? day.precipitationSum ?? 0);
    const rainProb = Number(day.precipitationProbabilityPercent ?? day.precipitationProbabilityMax ?? 0);

    const safeMinT = Number.isFinite(minT) ? minT : null;
    const safeMaxT = Number.isFinite(maxT) ? maxT : null;
    const safeRain = Number.isFinite(rain) && rain >= 0 ? rain : 0;
    const safeRainProb = Number.isFinite(rainProb) ? Math.min(Math.max(rainProb, 0), 100) : 0;

    totalRainfallMm += safeRain;
    if (safeRain > maxDailyRainfallMm) maxDailyRainfallMm = safeRain;

    if (safeRain >= 2.5) {
      rainyDaysCount += 1;
      currentRainStreak += 1;
      if (currentRainStreak > maxConsecutiveRainDays) {
        maxConsecutiveRainDays = currentRainStreak;
      }
    } else {
      currentRainStreak = 0;
    }

    if (safeMaxT !== null) {
      if (safeMaxT > peakMaxTempC) peakMaxTempC = safeMaxT;
      if (safeMaxT >= 38) heatwaveDaysCount += 1;
      tempSum += safeMaxT;
      validTempDays += 1;
    }

    if (safeMinT !== null) {
      if (safeMinT < lowestMinTempC) lowestMinTempC = safeMinT;
      if (safeMinT <= 5) frostRiskDaysCount += 1;
    }

    validatedDaily.push({
      date: String(day.date).slice(0, 10),
      minTempC: safeMinT,
      maxTempC: safeMaxT,
      precipitationMm: Number(safeRain.toFixed(1)),
      precipitationProbabilityPercent: Math.round(safeRainProb),
      condition: day.condition || "partly-cloudy",
      conditionLabel: day.conditionLabel || "Partly Cloudy",
    });
  }

  const meanTempC = validTempDays > 0 ? Number((tempSum / validTempDays).toFixed(1)) : null;

  return {
    available: true,
    farmId: farm?.id || null,
    farmName: farm?.name || null,
    latitude: lat,
    longitude: lon,
    timezone: timezone || "UTC",
    provider: provider || "Open-Meteo",
    fetchedAt: fetchedAt || new Date().toISOString(),
    isStale,
    current: current
      ? {
          temperatureC: Number.isFinite(Number(current.temperatureC)) ? Number(current.temperatureC) : null,
          apparentTemperatureC: Number.isFinite(Number(current.apparentTemperatureC))
            ? Number(current.apparentTemperatureC)
            : null,
          relativeHumidityPercent: Number.isFinite(Number(current.relativeHumidityPercent))
            ? Number(current.relativeHumidityPercent)
            : null,
          precipitationMm: Number.isFinite(Number(current.precipitationMm)) ? Number(current.precipitationMm) : 0,
          condition: current.condition || "partly-cloudy",
          conditionLabel: current.conditionLabel || "Partly Cloudy",
          observedAt: current.observedAt || new Date().toISOString(),
        }
      : null,
    summary10Day: {
      totalRainfallMm: Number(totalRainfallMm.toFixed(1)),
      maxDailyRainfallMm: Number(maxDailyRainfallMm.toFixed(1)),
      rainyDaysCount,
      consecutiveRainyDays: maxConsecutiveRainDays,
      peakMaxTempC: peakMaxTempC === -Infinity ? null : Number(peakMaxTempC.toFixed(1)),
      lowestMinTempC: lowestMinTempC === Infinity ? null : Number(lowestMinTempC.toFixed(1)),
      heatwaveDaysCount,
      frostRiskDaysCount,
      meanTempC,
      forecastDays: validatedDaily.length,
    },
    dailyForecast: validatedDaily,
    warnings: Array.isArray(warnings) ? warnings : [],
  };
}
