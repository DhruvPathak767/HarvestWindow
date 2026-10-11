import {
  HARVEST_SUITABILITY,
  URGENCY_LEVEL,
  CONFIDENCE_LEVEL,
  RISK_CATEGORY,
  RISK_SEVERITY,
} from "./weatherRisk.constants.js";
import { resolveCropRiskConfig } from "./weatherRisk.config.js";

/**
 * Parses date string or Date object safely to UTC midnight Date.
 */
function parseUtcDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const str = String(input).slice(0, 10);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function dateDiffDays(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function formatIsoDate(date) {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Pure, deterministic rules-based Weather Risk Assessment Engine for HarvestWindow Phase AI-3.
 *
 * @param {Object} params
 * @param {Object} params.crop - Crop data from database
 * @param {Object} [params.harvestPrediction] - Harvest prediction from Phase AI-2
 * @param {Array<Object>} params.forecastRecords - Normalized daily forecast records
 * @param {Object} [params.dataQuality] - Forecast data quality metadata
 * @param {Object} [params.source] - Provider and retrieval metadata
 * @param {Date|string} [params.referenceDate] - Current date reference
 * @returns {Object} Comprehensive weather risk assessment
 */
export function evaluateHarvestWeatherRisk({
  crop,
  harvestPrediction = null,
  forecastRecords = [],
  dataQuality = {},
  source = {},
  referenceDate = new Date(),
}) {
  const refDate = parseUtcDate(referenceDate) || new Date();
  const cropName = crop?.cropName || crop?.name || "Generic Crop";
  const variety = crop?.variety || null;
  const growthStage = String(crop?.growthStage || "").toLowerCase();
  const config = resolveCropRiskConfig(cropName, variety);

  // 1. Data Quality & Coverage Check
  if (!Array.isArray(forecastRecords) || forecastRecords.length === 0) {
    return {
      cropId: crop?.id || null,
      cropName,
      variety,
      harvestWindow: null,
      forecastCoverage: null,
      overallRiskScore: 0,
      harvestSuitability: HARVEST_SUITABILITY.INSUFFICIENT_DATA,
      urgency: URGENCY_LEVEL.LOW,
      confidence: CONFIDENCE_LEVEL.INSUFFICIENT_DATA,
      dataQuality: {
        complete: false,
        missingFields: ["forecastRecords"],
        notes: ["No weather forecast records available for assessment."],
      },
      risks: [],
      recommendations: [
        "Weather forecast is unavailable. Check farm geographic coordinates or retry later.",
      ],
      explanation: [
        "Weather risk could not be assessed because forecast data was empty or unresolvable.",
      ],
      generatedAt: new Date().toISOString(),
      source: {
        provider: source.provider || "Unknown",
        fetchedAt: source.fetchedAt || new Date().toISOString(),
      },
    };
  }

  const forecastStart = parseUtcDate(forecastRecords[0].date);
  const forecastEnd = parseUtcDate(forecastRecords[forecastRecords.length - 1].date);
  const forecastCoverage = {
    start: `${formatIsoDate(forecastStart)}T00:00:00Z`,
    end: `${formatIsoDate(forecastEnd)}T23:59:59Z`,
  };

  // 2. Resolve Harvest Window
  let windowStart = null;
  let windowEnd = null;
  let mostLikelyDate = null;
  let hasValidWindow = false;

  if (harvestPrediction) {
    windowStart = parseUtcDate(harvestPrediction.estimatedHarvestStart || harvestPrediction.estimated_harvest_start);
    windowEnd = parseUtcDate(harvestPrediction.estimatedHarvestEnd || harvestPrediction.estimated_harvest_end);
    mostLikelyDate = parseUtcDate(harvestPrediction.mostLikelyHarvestDate || harvestPrediction.most_likely_harvest_date);
  } else if (crop?.expectedHarvestDate) {
    mostLikelyDate = parseUtcDate(crop.expectedHarvestDate);
    if (mostLikelyDate) {
      windowStart = new Date(mostLikelyDate.getTime() - 3 * 86400000);
      windowEnd = new Date(mostLikelyDate.getTime() + 4 * 86400000);
    }
  }

  if (windowStart && windowEnd && !isNaN(windowStart.getTime()) && !isNaN(windowEnd.getTime())) {
    hasValidWindow = true;
  }

  const harvestWindow = hasValidWindow
    ? {
        start: formatIsoDate(windowStart),
        end: formatIsoDate(windowEnd),
        mostLikely: formatIsoDate(mostLikelyDate || windowStart),
      }
    : null;

  // Check temporal relationship between forecast horizon and harvest window
  let windowWithinForecast = false;
  let windowCompletelyOutside = false;
  let windowPartiallyOverlaps = false;
  let daysUntilWindowStart = null;

  if (hasValidWindow) {
    daysUntilWindowStart = dateDiffDays(refDate, windowStart);
    if (windowEnd < forecastStart || windowStart > forecastEnd) {
      windowCompletelyOutside = true;
    } else if (windowStart >= forecastStart && windowEnd <= forecastEnd) {
      windowWithinForecast = true;
    } else {
      windowPartiallyOverlaps = true;
    }
  }

  // 3. Evaluate Risk Dimensions
  const risks = [];
  const explanations = [];
  const recommendations = [];

  // Helper to check if a forecast day overlaps or precedes the harvest window
  function getWindowProximityFactor(dayDate) {
    if (!hasValidWindow) return 0.5; // neutral weight if window is unknown
    if (dayDate >= windowStart && dayDate <= windowEnd) return 1.0; // direct overlap
    const daysBefore = dateDiffDays(dayDate, windowStart);
    if (daysBefore >= 1 && daysBefore <= 2) return 0.85; // immediate pre-harvest
    if (daysBefore >= 3 && daysBefore <= 5) return 0.6; // short-term approach
    return 0.3; // far from window
  }

  // -------------------------------------------------------------------------
  // A. RAINFALL RISK
  // -------------------------------------------------------------------------
  let totalRainMm = 0;
  let maxDailyRainMm = 0;
  let maxRainProb = 0;
  let rainEvents = [];
  let consecutiveWetDays = 0;
  let maxConsecutiveWet = 0;
  let wetEventStart = null;
  let wetEventRain = 0;

  for (const day of forecastRecords) {
    const dayDate = parseUtcDate(day.date);
    const rain = Number(day.rainfallMm || 0);
    const prob = Number(day.precipitationProbabilityPercent || 0);

    totalRainMm += rain;
    if (rain > maxDailyRainMm) maxDailyRainMm = rain;
    if (prob > maxRainProb) maxRainProb = prob;

    if (rain >= config.rainfall.lightMm) {
      if (consecutiveWetDays === 0) wetEventStart = day.date;
      consecutiveWetDays++;
      wetEventRain += rain;
      if (consecutiveWetDays > maxConsecutiveWet) maxConsecutiveWet = consecutiveWetDays;
    } else {
      consecutiveWetDays = 0;
      wetEventRain = 0;
    }

    if (rain >= config.rainfall.harvestDamageThresholdMm || (rain >= 4 && prob >= 70)) {
      rainEvents.push({
        date: day.date,
        rain,
        prob,
        proximity: getWindowProximityFactor(dayDate),
      });
    }
  }

  let rainfallScore = 0;
  let rainfallSeverity = RISK_SEVERITY.NONE;
  let rainfallInterval = null;

  if (rainEvents.length > 0 || totalRainMm >= 10) {
    // Weighted rainfall score: accumulation magnitude + probability + harvest window overlap
    let maxWeightedRainImpact = 0;
    for (const ev of rainEvents) {
      const accumulationFactor = Math.min(100, (ev.rain / config.rainfall.heavyMm) * 80);
      const probFactor = (ev.prob / 100) * 20;
      const singleScore = (accumulationFactor + probFactor) * ev.proximity;
      if (singleScore > maxWeightedRainImpact) {
        maxWeightedRainImpact = singleScore;
        rainfallInterval = {
          start: `${ev.date}T00:00:00Z`,
          end: `${ev.date}T23:59:59Z`,
          rainfallMm: ev.rain,
          precipitationProbabilityPercent: ev.prob,
        };
      }
    }

    // Add multi-day wet spell penalty
    const wetSpellBonus = maxConsecutiveWet >= config.rainfall.consecutiveWetDays ? 15 : 0;
    rainfallScore = Math.min(100, Math.round(maxWeightedRainImpact + wetSpellBonus));

    if (rainfallScore >= 70) rainfallSeverity = RISK_SEVERITY.HIGH;
    else if (rainfallScore >= 40) rainfallSeverity = RISK_SEVERITY.MODERATE;
    else if (rainfallScore >= 15) rainfallSeverity = RISK_SEVERITY.LOW;
  }

  if (rainfallScore >= 15) {
    const isDirectOverlap = rainEvents.some((e) => e.proximity === 1.0);
    const rainExpl = isDirectOverlap
      ? `Forecast rainfall (${maxDailyRainMm} mm peak) overlaps the expected harvest window, threatening field operability and mature ${cropName} produce.`
      : `Forecast rainfall (${maxDailyRainMm} mm peak, ${Math.round(totalRainMm)} mm total) is expected during the upcoming 10-day period.`;

    const rainAction =
      rainfallScore >= 60
        ? `Ensure field drainage channels are cleared. If ${cropName} is mature and field conditions permit, accelerate harvesting before heavy rainfall begins; otherwise, hold combine operations until fields dry.`
        : `Monitor local rainfall trends and confirm field firmness before dispatching heavy harvest machinery.`;

    risks.push({
      category: RISK_CATEGORY.RAINFALL,
      score: rainfallScore,
      severity: rainfallSeverity,
      eventStart: rainfallInterval ? rainfallInterval.start : forecastCoverage.start,
      eventEnd: rainfallInterval ? rainfallInterval.end : forecastCoverage.end,
      observedOrForecastValues: {
        maxDailyRainfallMm: maxDailyRainMm,
        totalRainfallMm: Math.round(totalRainMm * 10) / 10,
        precipitationProbabilityPercent: maxRainProb,
        consecutiveWetDays: maxConsecutiveWet,
      },
      explanation: [rainExpl],
      recommendedActions: [rainAction],
    });
    explanations.push(rainExpl);
  }

  // -------------------------------------------------------------------------
  // B. HUMIDITY & DRYING RISK
  // -------------------------------------------------------------------------
  let highHumidityDays = 0;
  let maxHumidity = 0;
  let humidityInterval = null;

  for (const day of forecastRecords) {
    const hum = Number(day.humidityPercent || 0);
    if (hum > maxHumidity) maxHumidity = hum;
    if (hum >= config.humidity.dryingRiskThresholdPercent) {
      highHumidityDays++;
      if (!humidityInterval) {
        humidityInterval = {
          start: `${day.date}T00:00:00Z`,
          end: `${day.date}T23:59:59Z`,
        };
      }
    }
  }

  let humidityScore = 0;
  let humiditySeverity = RISK_SEVERITY.NONE;

  if (highHumidityDays >= config.humidity.consecutiveDays || maxHumidity >= 85) {
    const excessHum = Math.max(0, maxHumidity - config.humidity.dryingRiskThresholdPercent);
    humidityScore = Math.min(100, Math.round(excessHum * 3.5 + highHumidityDays * 12));

    if (humidityScore >= 65) humiditySeverity = RISK_SEVERITY.HIGH;
    else if (humidityScore >= 35) humiditySeverity = RISK_SEVERITY.MODERATE;
    else if (humidityScore >= 15) humiditySeverity = RISK_SEVERITY.LOW;

    if (humidityScore >= 15) {
      const humExpl = `Sustained high relative humidity (up to ${maxHumidity}%) across ${highHumidityDays} forecast days may significantly retard post-harvest sun drying and moisture loss.`;
      const humAction = `Arrange artificial/mechanical drying facilities or covered, well-ventilated storage tarpaulins to prevent fungal development and grain moisture retention.`;

      risks.push({
        category: RISK_CATEGORY.HUMIDITY_DRYING,
        score: humidityScore,
        severity: humiditySeverity,
        eventStart: humidityInterval ? humidityInterval.start : forecastCoverage.start,
        eventEnd: forecastCoverage.end,
        observedOrForecastValues: {
          maxHumidityPercent: maxHumidity,
          highHumidityDaysCount: highHumidityDays,
          thresholdPercent: config.humidity.dryingRiskThresholdPercent,
        },
        explanation: [humExpl],
        recommendedActions: [humAction],
      });
      explanations.push(humExpl);
    }
  }

  // -------------------------------------------------------------------------
  // C. WIND RISK
  // -------------------------------------------------------------------------
  let maxWindMps = 0;
  let maxGustMps = 0;
  let highWindDate = null;

  for (const day of forecastRecords) {
    const wind = Number(day.windSpeedMps || 0);
    const gust = Number(day.windGustMps || 0);
    if (wind > maxWindMps) {
      maxWindMps = wind;
      highWindDate = day.date;
    }
    if (gust > maxGustMps) maxGustMps = gust;
  }

  let windScore = 0;
  let windSeverity = RISK_SEVERITY.NONE;

  if (maxWindMps >= config.wind.lodgingSpeedMps || maxGustMps >= config.wind.gustSpeedMps) {
    const windExcess = Math.max(0, maxWindMps - config.wind.lodgingSpeedMps);
    const gustExcess = Math.max(0, maxGustMps - config.wind.gustSpeedMps);
    windScore = Math.min(100, Math.round(40 + windExcess * 12 + gustExcess * 6));

    if (windScore >= 65) windSeverity = RISK_SEVERITY.HIGH;
    else if (windScore >= 35) windSeverity = RISK_SEVERITY.MODERATE;
    else windSeverity = RISK_SEVERITY.LOW;

    const windExpl = `Strong wind speeds (${maxWindMps} m/s sustained, ${maxGustMps} m/s gusts) forecast around ${highWindDate}. Can cause crop lodging in tall or top-heavy ${cropName} and complicate mechanical combine operations.`;
    const windAction = `Inspect canopy lodging resistance and secure tall crop blocks. Avoid elevated harvesting operations during peak gust periods.`;

    risks.push({
      category: RISK_CATEGORY.WIND,
      score: windScore,
      severity: windSeverity,
      eventStart: highWindDate ? `${highWindDate}T00:00:00Z` : forecastCoverage.start,
      eventEnd: highWindDate ? `${highWindDate}T23:59:59Z` : forecastCoverage.end,
      observedOrForecastValues: {
        maxWindSpeedMps: maxWindMps,
        maxWindGustMps: maxGustMps,
        lodgingThresholdMps: config.wind.lodgingSpeedMps,
      },
      explanation: [windExpl],
      recommendedActions: [windAction],
    });
    explanations.push(windExpl);
  }

  // -------------------------------------------------------------------------
  // D. TEMPERATURE & HEAT RISK
  // -------------------------------------------------------------------------
  let maxTempC = -Infinity;
  let minTempC = Infinity;
  let extremeHeatDate = null;
  let frostDate = null;

  for (const day of forecastRecords) {
    const maxT = day.maxTempC !== null ? Number(day.maxTempC) : -Infinity;
    const minT = day.minTempC !== null ? Number(day.minTempC) : Infinity;
    if (maxT > maxTempC) {
      maxTempC = maxT;
      extremeHeatDate = day.date;
    }
    if (minT < minTempC) {
      minTempC = minT;
      frostDate = day.date;
    }
  }

  let tempScore = 0;
  let tempSeverity = RISK_SEVERITY.NONE;

  if (maxTempC >= config.temperature.heatDamageC) {
    tempScore = Math.min(100, Math.round(30 + (maxTempC - config.temperature.heatDamageC) * 15));
    if (tempScore >= 60) tempSeverity = RISK_SEVERITY.HIGH;
    else tempSeverity = RISK_SEVERITY.MODERATE;

    const heatExpl = `Peak temperatures reaching ${maxTempC}°C forecast on ${extremeHeatDate}. High heat can accelerate premature drying, increase seed shattering, and induce field worker heat stress.`;
    const heatAction = `Schedule field harvesting operations during cooler morning or late evening hours. Ensure field laborers have adequate hydration and shading.`;

    risks.push({
      category: RISK_CATEGORY.TEMPERATURE,
      score: tempScore,
      severity: tempSeverity,
      eventStart: `${extremeHeatDate}T00:00:00Z`,
      eventEnd: `${extremeHeatDate}T23:59:59Z`,
      observedOrForecastValues: {
        maxTemperatureC: maxTempC,
        heatThresholdC: config.temperature.heatDamageC,
        workerSafetyThresholdC: config.temperature.workerSafetyC,
      },
      explanation: [heatExpl],
      recommendedActions: [heatAction],
    });
    explanations.push(heatExpl);
  } else if (minTempC <= config.temperature.frostDamageC && minTempC !== Infinity) {
    tempScore = Math.min(100, Math.round(30 + (config.temperature.frostDamageC - minTempC) * 15));
    if (tempScore >= 60) tempSeverity = RISK_SEVERITY.HIGH;
    else tempSeverity = RISK_SEVERITY.MODERATE;

    const frostExpl = `Overnight low temperatures dipping to ${minTempC}°C forecast on ${frostDate}, presenting cold stress or frost risk for late-maturing ${cropName}.`;
    const frostAction = `Monitor tender vegetative and pod tissue. Plan protective measures or expedite harvest of fully mature blocks before extreme freeze.`;

    risks.push({
      category: RISK_CATEGORY.TEMPERATURE,
      score: tempScore,
      severity: tempSeverity,
      eventStart: `${frostDate}T00:00:00Z`,
      eventEnd: `${frostDate}T23:59:59Z`,
      observedOrForecastValues: {
        minTemperatureC: minTempC,
        frostThresholdC: config.temperature.frostDamageC,
      },
      explanation: [frostExpl],
      recommendedActions: [frostAction],
    });
    explanations.push(frostExpl);
  }

  // -------------------------------------------------------------------------
  // 4. OVERALL HARVEST WEATHER RISK SCORE (0–100)
  // -------------------------------------------------------------------------
  // Weighted composite with bottleneck protection for severe individual risks
  const rawComposite =
    rainfallScore * 0.45 +
    humidityScore * 0.20 +
    windScore * 0.20 +
    tempScore * 0.15;

  const maxIndividualScore = Math.max(rainfallScore, humidityScore, windScore, tempScore);
  const overallRiskScore = Math.min(
    100,
    Math.round(Math.max(rawComposite, maxIndividualScore >= 75 ? maxIndividualScore * 0.9 : rawComposite))
  );

  // -------------------------------------------------------------------------
  // 5. HARVEST SUITABILITY STATUS
  // -------------------------------------------------------------------------
  let harvestSuitability = HARVEST_SUITABILITY.FAVORABLE;

  if (overallRiskScore >= 65 || rainfallScore >= 70 || windScore >= 75) {
    harvestSuitability = HARVEST_SUITABILITY.UNFAVORABLE;
  } else if (overallRiskScore >= 30 || rainfallScore >= 35 || humidityScore >= 50 || windScore >= 45) {
    harvestSuitability = HARVEST_SUITABILITY.CAUTION;
  } else {
    harvestSuitability = HARVEST_SUITABILITY.FAVORABLE;
  }

  // -------------------------------------------------------------------------
  // 6. URGENCY EVALUATION
  // -------------------------------------------------------------------------
  let urgency = URGENCY_LEVEL.LOW;

  const isCropRipeningOrMature =
    growthStage.includes("ripen") ||
    growthStage.includes("matur") ||
    growthStage.includes("harvest") ||
    (harvestPrediction && harvestPrediction.daysUntilHarvest <= 3);

  // CRITICAL is strictly reserved for time-sensitive situations: severe adverse event within 48h for mature crop
  if (
    isCropRipeningOrMature &&
    overallRiskScore >= 65 &&
    rainEvents.some((e) => {
      const d = dateDiffDays(refDate, parseUtcDate(e.date));
      return d !== null && d >= 0 && d <= 2 && e.rain >= config.rainfall.harvestDamageThresholdMm;
    })
  ) {
    urgency = URGENCY_LEVEL.CRITICAL;
  } else if (overallRiskScore >= 55 && (hasValidWindow ? daysUntilWindowStart <= 5 : true)) {
    urgency = URGENCY_LEVEL.HIGH;
  } else if (overallRiskScore >= 30 && (hasValidWindow ? daysUntilWindowStart <= 7 : true)) {
    urgency = URGENCY_LEVEL.MEDIUM;
  } else {
    urgency = URGENCY_LEVEL.LOW;
  }

  // -------------------------------------------------------------------------
  // 7. CONFIDENCE & DATA QUALITY
  // -------------------------------------------------------------------------
  let confidence = CONFIDENCE_LEVEL.HIGH;

  if (config.isGeneric) {
    confidence = CONFIDENCE_LEVEL.MODERATE;
  }

  if (windowCompletelyOutside) {
    confidence = CONFIDENCE_LEVEL.LOW;
    explanations.push(
      `Predicted harvest window (${harvestWindow.start} to ${harvestWindow.end}) lies beyond the 10-day weather forecast horizon (${forecastCoverage.start.slice(0, 10)} to ${forecastCoverage.end.slice(0, 10)}). Current evaluation reflects intermediate field conditions, not harvest-day weather.`
    );
  } else if (windowPartiallyOverlaps) {
    if (confidence === CONFIDENCE_LEVEL.HIGH) confidence = CONFIDENCE_LEVEL.MODERATE;
    explanations.push(
      `Weather forecast partially covers the harvest window. Dates through ${forecastCoverage.end.slice(0, 10)} are evaluated; subsequent days are outside the provider horizon.`
    );
  } else if (!hasValidWindow) {
    confidence = CONFIDENCE_LEVEL.LOW;
    explanations.push(
      "Harvest window is not yet established. Weather risk reflects current field meteorological conditions rather than harvest-window overlap."
    );
  }

  if (dataQuality.missingFields && dataQuality.missingFields.length > 0) {
    if (confidence === CONFIDENCE_LEVEL.HIGH) confidence = CONFIDENCE_LEVEL.MODERATE;
  }

  // -------------------------------------------------------------------------
  // 8. SYNTHESIZE EXPLANATIONS & RECOMMENDATIONS
  // -------------------------------------------------------------------------
  if (explanations.length === 0) {
    explanations.push(
      `Weather conditions appear stable and favorable across the 10-day forecast horizon. No severe rainfall, wind, or extreme temperatures detected.`
    );
  }

  // Synthesize top actionable recommendations
  for (const r of risks) {
    if (r.recommendedActions) {
      for (const act of r.recommendedActions) {
        if (!recommendations.includes(act)) recommendations.push(act);
      }
    }
  }

  if (recommendations.length === 0) {
    if (harvestSuitability === HARVEST_SUITABILITY.FAVORABLE) {
      recommendations.push(
        "Current weather forecast is favorable for field operations. Maintain normal monitoring as harvest window approaches."
      );
    }
  }

  return {
    cropId: crop?.id || null,
    cropName,
    variety,
    harvestWindow,
    forecastCoverage,
    overallRiskScore,
    harvestSuitability,
    urgency,
    confidence,
    dataQuality: {
      complete: Boolean(dataQuality.complete ?? true),
      missingFields: dataQuality.missingFields || [],
      windowWithinForecast,
      windowCompletelyOutside,
      windowPartiallyOverlaps,
      isGenericThresholds: config.isGeneric,
      thresholdSource: config.evidenceSource,
    },
    risks,
    recommendations,
    explanation: explanations,
    generatedAt: new Date().toISOString(),
    source: {
      provider: source.provider || "Open-Meteo",
      fetchedAt: source.fetchedAt || new Date().toISOString(),
    },
  };
}
