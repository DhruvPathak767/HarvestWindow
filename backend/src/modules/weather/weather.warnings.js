import { DEFAULT_WARNING_THRESHOLDS } from "./weather.constants.js";

/**
 * Generates structured agricultural warnings based on daily weather forecast readings.
 * Evaluates rainfall events, multi-day wet spells, heatwaves, and frost risks.
 *
 * @param {Array<Object>} dailyForecast - Normalized daily forecast array
 * @param {Object} [customThresholds] - Optional overrides for warning triggers
 * @returns {Array<Object>} Sorted list of warning objects
 */
export function generateWeatherWarnings(dailyForecast, customThresholds = {}) {
  if (!Array.isArray(dailyForecast) || dailyForecast.length === 0) {
    return [];
  }

  const th = { ...DEFAULT_WARNING_THRESHOLDS, ...customThresholds };
  const warnings = [];
  const seenKeys = new Set();

  function addWarning(warning) {
    const key = `${warning.type}:${warning.date}:${warning.title}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      warnings.push(warning);
    }
  }

  // 1. Single-day checks
  dailyForecast.forEach((day) => {
    const rain = Number(day.precipitationMm ?? day.precipitationSum ?? 0);
    const rainProb = Number(day.precipitationProbabilityMax ?? day.rainProbability ?? 0);
    const maxTemp = Number(day.maxTempC ?? day.maxTemperatureC ?? 0);
    const minTemp = Number(day.minTempC ?? day.minTemperatureC ?? 0);
    const date = day.date;

    // Heavy Rainfall Warning
    if (rain >= th.HEAVY_RAIN_MM) {
      addWarning({
        id: `warn-rain-heavy-${date}`,
        type: "RAIN",
        severity: "HIGH",
        title: "Heavy rainfall expected",
        message: `Forecast indicates ${rain} mm of rainfall on ${date}. Ground saturation may delay field machinery and harvesting.`,
        date,
        value: rain,
        unit: "mm",
      });
    } else if (rain >= th.MODERATE_RAIN_MM) {
      addWarning({
        id: `warn-rain-mod-${date}`,
        type: "RAIN",
        severity: "MEDIUM",
        title: "Moderate rainfall expected",
        message: `Rainfall of ${rain} mm expected on ${date}. Check field drainage and evaluate produce readiness.`,
        date,
        value: rain,
        unit: "mm",
      });
    } else if (rainProb >= th.HIGH_RAIN_PROBABILITY_PCT && rain >= 3) {
      addWarning({
        id: `warn-rain-prob-${date}`,
        type: "RAIN",
        severity: "MEDIUM",
        title: "High probability of rain",
        message: `${rainProb}% chance of precipitation with ${rain} mm expected on ${date}.`,
        date,
        value: rainProb,
        unit: "%",
      });
    }

    // High Temperature Warning
    if (maxTemp >= th.HEAT_HIGH_C) {
      addWarning({
        id: `warn-heat-high-${date}`,
        type: "TEMPERATURE",
        severity: "HIGH",
        title: "Extreme heat alert",
        message: `Peak temperature expected to reach ${maxTemp}°C on ${date}. Rapid grain drying and moisture loss may accelerate harvest window.`,
        date,
        value: maxTemp,
        unit: "°C",
      });
    } else if (maxTemp >= th.HEAT_MODERATE_C) {
      addWarning({
        id: `warn-heat-mod-${date}`,
        type: "TEMPERATURE",
        severity: "MEDIUM",
        title: "High temperature warning",
        message: `Maximum temperature of ${maxTemp}°C expected on ${date}. Monitor crop stress and evapotranspiration.`,
        date,
        value: maxTemp,
        unit: "°C",
      });
    }

    // Cold / Frost Warning
    if (minTemp <= th.COLD_SEVERE_C) {
      addWarning({
        id: `warn-cold-severe-${date}`,
        type: "TEMPERATURE",
        severity: "HIGH",
        title: "Frost / Severe cold risk",
        message: `Overnight temperature falling to ${minTemp}°C on ${date}. Potential frost risk for sensitive flowering and fruiting crops.`,
        date,
        value: minTemp,
        unit: "°C",
      });
    } else if (minTemp <= th.COLD_MODERATE_C) {
      addWarning({
        id: `warn-cold-mod-${date}`,
        type: "TEMPERATURE",
        severity: "LOW",
        title: "Low overnight temperature",
        message: `Minimum temperature reaching ${minTemp}°C on ${date}.`,
        date,
        value: minTemp,
        unit: "°C",
      });
    }
  });

  // 2. Multi-day Wet Spell Analysis (consecutive wet days)
  let consecutiveWetDays = 0;
  let wetSpellStart = null;
  let totalWetSpellRain = 0;

  dailyForecast.forEach((day, index) => {
    const rain = Number(day.precipitationMm ?? day.precipitationSum ?? 0);
    if (rain >= th.WET_SPELL_MIN_RAIN_MM) {
      if (consecutiveWetDays === 0) wetSpellStart = day.date;
      consecutiveWetDays++;
      totalWetSpellRain += rain;

      if (consecutiveWetDays >= th.WET_SPELL_CONSECUTIVE_DAYS && (index === dailyForecast.length - 1 || Number(dailyForecast[index + 1]?.precipitationMm ?? 0) < th.WET_SPELL_MIN_RAIN_MM)) {
        addWarning({
          id: `warn-wet-spell-${wetSpellStart}`,
          type: "RAIN",
          severity: "HIGH",
          title: "Multi-day wet spell forecast",
          message: `Continuous rainfall detected over ${consecutiveWetDays} consecutive days starting ${wetSpellStart} (${Math.round(totalWetSpellRain)} mm total). Extended field inaccessibility expected.`,
          date: wetSpellStart,
          value: Math.round(totalWetSpellRain),
          unit: "mm",
        });
      }
    } else {
      consecutiveWetDays = 0;
      wetSpellStart = null;
      totalWetSpellRain = 0;
    }
  });

  // Sort warnings: HIGH first, then MEDIUM, then LOW; then chronologically
  const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  warnings.sort((a, b) => {
    const diff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (diff !== 0) return diff;
    return String(a.date).localeCompare(String(b.date));
  });

  return warnings;
}
