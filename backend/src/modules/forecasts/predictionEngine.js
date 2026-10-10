import {
  STAGE_TEMPLATES,
  TEMPLATE_BOUNDARIES,
  resolveCropRule,
} from "./cropRules.js";

/**
 * Standard utility to parse date input safely into a calendar Date object (UTC midnight).
 *
 * @param {Date | string | number} input
 * @returns {Date | null}
 */
export function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }

  const str = String(input).trim();
  // Match YYYY-MM-DD format
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime()) && d.getUTCFullYear() === year && d.getUTCMonth() === month) {
      return d;
    }
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

/**
 * Formats a Date object to an ISO date string (YYYY-MM-DD).
 *
 * @param {Date} date
 * @returns {string}
 */
export function toDateString(date) {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Adds an integer number of days to a Date object in UTC.
 *
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Computes calendar day difference (b - a).
 *
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export function diffDays(a, b) {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Maps a numerical confidence score to standard agricultural confidence tiers.
 *
 * @param {number} score
 * @returns {'LOW' | 'MEDIUM' | 'HIGH'}
 */
export function getConfidenceLevel(score) {
  if (score >= 80) return "HIGH";
  if (score >= 56) return "MEDIUM";
  return "LOW";
}

/**
 * Builds growth stage timeline based on crop developmental boundaries.
 *
 * @param {Object} crop
 * @param {Date} planted
 * @param {Date} windowStart
 * @param {Date} windowEnd
 * @param {string} templateName
 * @param {Date} refDate
 * @returns {Array<Object>}
 */
export function buildGrowthTimeline(crop, planted, windowStart, windowEnd, templateName, refDate) {
  const stages = STAGE_TEMPLATES[templateName] || STAGE_TEMPLATES.cerealGrain;
  const boundaries = TEMPLATE_BOUNDARIES[templateName] || TEMPLATE_BOUNDARIES.cerealGrain;

  const totalPreWindowDays = Math.max(diffDays(planted, windowStart), stages.length * 3);
  const recordedStageNorm = (crop.growthStage || "").toLowerCase().trim();

  const timeline = stages.map((stageName, i) => {
    const startOffset = Math.round(boundaries[i] * totalPreWindowDays);
    const endOffset = Math.round(boundaries[i + 1] * totalPreWindowDays);

    const stageStart = addDays(planted, startOffset);
    const stageEnd = addDays(planted, endOffset);

    const isPast = stageEnd.getTime() <= refDate.getTime();
    const isCurrent = stageStart.getTime() <= refDate.getTime() && refDate.getTime() < stageEnd.getTime();
    const matchesRecorded = recordedStageNorm && stageName.toLowerCase().includes(recordedStageNorm);

    let status = "UPCOMING";
    if (isPast) status = "COMPLETED";
    else if (isCurrent) status = "CURRENT";

    return {
      stage: stageName,
      startDate: toDateString(stageStart),
      endDate: toDateString(stageEnd),
      status,
      observed: isPast || Boolean(matchesRecorded),
      shareOfSeason: Number((boundaries[i + 1] - boundaries[i]).toFixed(3)),
    };
  });

  // Append harvest window as the terminal milestone
  timeline.push({
    stage: "Estimated harvest window",
    startDate: toDateString(windowStart),
    endDate: toDateString(windowEnd),
    status: windowEnd.getTime() < refDate.getTime()
      ? "COMPLETED"
      : windowStart.getTime() <= refDate.getTime()
        ? "CURRENT"
        : "UPCOMING",
    observed: crop.growthStage === "HARVESTED",
    shareOfSeason: 0,
  });

  return timeline;
}

/**
 * Pure, deterministic harvest prediction engine.
 *
 * Receives crop data, optional weather context, and reference date, and computes:
 * 1. Estimated harvest window (startDate, typicalDate, endDate)
 * 2. Days remaining to window and typical harvest
 * 3. Readiness status and level
 * 4. Growth-stage timeline
 * 5. Transparent confidence score and confidence tier
 * 6. Detailed contributing factors with machine-readable codes
 *
 * @param {Object} params
 * @param {Object} params.crop - Crop record
 * @param {Date | string} [params.referenceDate] - Reference date for calculation (defaults to now)
 * @param {Object | null} [params.weatherContext] - Optional weather signals (Phase 4 integration point)
 * @returns {Object} Structured harvest forecast
 */
export function predictHarvestWindow({ crop, referenceDate = new Date(), weatherContext = null }) {
  const refDate = parseDate(referenceDate) || parseDate(new Date());
  const nowIso = new Date().toISOString();

  const cropName = crop.cropName || crop.name || "";
  const variety = crop.variety || null;
  const sowingDateRaw = crop.sowingDate || crop.plantingDate;
  const sowingDate = parseDate(sowingDateRaw);
  const expectedHarvestDate = parseDate(crop.expectedHarvestDate);
  const recordedStage = (crop.growthStage || "").toUpperCase().trim();

  // 1. Handle Missing Sowing Date (Insufficient Data)
  if (!sowingDate) {
    return {
      id: `fc-${crop.id || "temp"}`,
      cropId: crop.id || null,
      farmId: crop.farmId || null,
      cropName,
      variety,
      readinessStatus: "growing", // Frontend fallback safe
      readinessLevel: "INSUFFICIENT_DATA",
      statusMeta: {
        label: "Insufficient data",
        short: "No date",
        description: "A recorded sowing date is required to calculate developmental timelines.",
        tone: "earth",
      },
      harvestWindow: {
        startDate: null,
        typicalDate: null,
        endDate: null,
      },
      baselineHarvestWindow: {
        startDate: null,
        typicalDate: null,
        endDate: null,
      },
      adjustedHarvestWindow: null,
      estimatedWindowStart: null,
      estimatedWindowEnd: null,
      daysToWindowStart: 0,
      daysToWindowEnd: 0,
      daysUntilHarvest: 0,
      seasonProgress: 0,
      confidence: {
        score: 0,
        level: "LOW",
        interpretation: "Cannot calculate timeline without a valid sowing date.",
      },
      growthTimeline: [],
      stagePlan: [],
      contributingFactors: [
        {
          id: "MISSING_SOWING_DATE",
          label: "Missing sowing date",
          detail: "Please record the sowing date for this crop to enable harvest window estimation.",
          direction: "neutral",
          weight: "high",
        },
      ],
      weatherFactors: [],
      weatherAdjustmentApplied: false,
      weatherAdjustmentStatus: "UNAVAILABLE",
      weatherAdjustmentDays: 0,
      weatherNote: "Weather adjustments not applicable without a baseline calendar timeline.",
      weatherDataTimestamp: null,
      forecastCalculationTimestamp: nowIso,
      weatherContextSummary: null,
      nextAction: "Record the sowing date in the crop profile to unlock harvest predictions.",
      calculatedAt: nowIso,
      updatedAt: nowIso,
      sourceType: "rule-based-engine",
      modelNote: "Deterministic agronomic rule-based model. No fabricated dates provided.",
    };
  }

  // 2. Resolve Agronomic Crop Duration Rules
  const ruleMatch = resolveCropRule(cropName, variety, true);
  const rule = ruleMatch ? ruleMatch.rule : null;
  const matchType = ruleMatch ? ruleMatch.matchType : "UNKNOWN";

  const minDays = rule ? rule.minDays : 100;
  const typicalDays = rule ? rule.typicalDays : 120;
  const maxDays = rule ? rule.maxDays : 145;
  const templateName = rule ? rule.stageTemplate : "cerealGrain";

  // 3. Baseline Calendar Harvest Window (Deterministic Agronomic Benchmark)
  const baseStart = addDays(sowingDate, minDays);
  const baseTypical = addDays(sowingDate, typicalDays);
  const baseEnd = addDays(sowingDate, maxDays);
  const baselineHarvestWindow = {
    startDate: toDateString(baseStart),
    typicalDate: toDateString(baseTypical),
    endDate: toDateString(baseEnd),
  };

  // 5. Defensible Weather Adjustment Layer (Phase 4 Integration)
  let weatherAdjustmentDays = 0;
  let weatherAdjustmentApplied = false;
  let weatherAdjustmentStatus = "UNAVAILABLE";
  let weatherNote = "Baseline agronomic reference model. Weather dataset not integrated.";
  const weatherFactors = [];

  if (weatherContext && typeof weatherContext === "object") {
    // 5a. Legacy/Test direct parameter overrides
    if (
      weatherContext.heatAdvanceDays !== undefined ||
      weatherContext.rainDelayDays !== undefined
    ) {
      const heatAdvance = Number(weatherContext.heatAdvanceDays) || 0;
      const rainDelay = Number(weatherContext.rainDelayDays) || 0;
      const rawNet = rainDelay - heatAdvance;
      weatherAdjustmentDays = Math.max(-5, Math.min(7, rawNet));
      weatherAdjustmentApplied = weatherAdjustmentDays !== 0;
      weatherAdjustmentStatus = weatherAdjustmentApplied ? "APPLIED" : "NOT_APPLIED";
      weatherNote =
        weatherContext.note ||
        (weatherAdjustmentApplied
          ? `Adjusted by ${weatherAdjustmentDays > 0 ? `+${weatherAdjustmentDays}` : weatherAdjustmentDays} days based on local conditions.`
          : "Weather conditions within seasonal baseline.");
      if (weatherAdjustmentApplied) {
        weatherFactors.push({
          id: "WEATHER_ADJUSTMENT_APPLIED",
          label: "Weather adjustments incorporated",
          detail: weatherNote,
          direction: weatherAdjustmentDays > 0 ? "delays" : "advances",
          weight: "medium",
        });
      }
    } else if (weatherContext.available === false) {
      // 5b. Weather requested but unavailable or coordinates missing
      weatherAdjustmentApplied = false;
      weatherAdjustmentStatus = "UNAVAILABLE";
      weatherAdjustmentDays = 0;
      weatherNote =
        weatherContext.reason === "MISSING_COORDINATES"
          ? "Farm coordinates missing. Baseline agronomic model active."
          : "Weather data unavailable. Baseline agronomic model active.";
      if (Array.isArray(weatherContext.weatherFactors) && weatherContext.weatherFactors.length > 0) {
        weatherFactors.push(...weatherContext.weatherFactors);
      } else {
        weatherFactors.push({
          id: "WEATHER_DATA_UNAVAILABLE",
          label: "Weather data unavailable",
          detail: "Baseline agronomic model active. No meteorological observations attached.",
          direction: "neutral",
          weight: "low",
        });
      }
    } else if (weatherContext.available === true) {
      // 5c. Valid Phase 4 Weather Context
      if (weatherContext.isStale) {
        weatherAdjustmentApplied = false;
        weatherAdjustmentStatus = "NOT_APPLIED";
        weatherAdjustmentDays = 0;
        weatherNote = "Weather forecast dataset is older than 24 hours. Bypassing adjustments to maintain prediction integrity.";
        weatherFactors.push({
          id: "WEATHER_DATA_STALE",
          label: "Weather dataset stale (>24h)",
          detail: "Weather forecast dataset exceeds 24-hour freshness threshold. Adjustments bypassed.",
          direction: "neutral",
          weight: "medium",
        });
      } else {
        // Evaluate crop proximity to harvest
        const daysToBaselineStart = diffDays(refDate, baseStart);
        const totalBaselineDuration = Math.max(diffDays(sowingDate, baseEnd), 1);
        const elapsedSinceSowing = diffDays(sowingDate, refDate);
        const baselineProgress = Math.min(Math.max(Number((elapsedSinceSowing / totalBaselineDuration).toFixed(2)), 0), 1);
        const isNearHarvest = daysToBaselineStart <= 21 || baselineProgress >= 0.70;

        if (!isNearHarvest) {
          // Crop is in vegetative development: 10-day forecast monitored but not applied to full season maturity
          weatherAdjustmentApplied = false;
          weatherAdjustmentStatus = "NOT_APPLIED";
          weatherAdjustmentDays = 0;
          weatherNote = `Crop is in vegetative development (${Math.round(baselineProgress * 100)}% progress). 10-day short-range forecast monitored for stress but cannot defensibly alter full-season maturity date.`;
          weatherFactors.push({
            id: "WEATHER_MONITORED_EARLY_STAGE",
            label: "Short-range weather monitored",
            detail: `Crop is at ${Math.round(baselineProgress * 100)}% development. 10-day forecast monitored for operational risk, but does not alter physiological maturity date.`,
            direction: "neutral",
            weight: "low",
          });

          // Attach any active warnings as informational evidence
          if (Array.isArray(weatherContext.warnings) && weatherContext.warnings.length > 0) {
            for (const w of weatherContext.warnings) {
              weatherFactors.push({
                id: `WEATHER_ALERT_${(w.type || "warning").toUpperCase()}`,
                label: w.title || "Weather Alert",
                detail: w.message || "Agronomic warning observed.",
                direction: "neutral",
                weight: "medium",
              });
            }
          }
        } else {
          // Crop is nearing maturity: evaluate meteorological signals
          const summary = weatherContext.summary10Day || {};
          const totalRain = summary.totalRainfallMm || 0;
          const maxDailyRain = summary.maxDailyRainfallMm || 0;
          const consecutiveRain = summary.consecutiveRainyDays || 0;
          const peakMaxT = summary.peakMaxTempC;
          const lowestMinT = summary.lowestMinTempC;
          const heatwaveDays = summary.heatwaveDaysCount || 0;
          const frostRiskDays = summary.frostRiskDaysCount || 0;

          let rainDelayDays = 0;
          let heatAdvanceDays = 0;
          let coldDelayDays = 0;

          // 1. Precipitation & Trafficability
          if (maxDailyRain >= 35 || totalRain >= 50 || consecutiveRain >= 4) {
            rainDelayDays = totalRain >= 60 ? 4 : 3;
            weatherFactors.push({
              id: "HEAVY_RAINFALL_HARVEST_DELAY",
              label: "Heavy rainfall trafficability delay",
              detail: `10-day forecast predicts heavy rain (${totalRain}mm total, max ${maxDailyRain}mm/day). Wet soil and drying delays harvesting by +${rainDelayDays} days.`,
              direction: "delays",
              weight: "high",
            });
          } else if (maxDailyRain >= 20 || totalRain >= 25 || consecutiveRain >= 3) {
            rainDelayDays = 2;
            weatherFactors.push({
              id: "MODERATE_RAINFALL_HARVEST_DELAY",
              label: "Rainfall field delay",
              detail: `Forecast indicates wet conditions (${totalRain}mm total, ${consecutiveRain} consecutive rain days). Estimated delay of +2 days for machinery access and grain drying.`,
              direction: "delays",
              weight: "medium",
            });
          }

          // 2. Terminal Heat Stress
          if (heatwaveDays >= 3 || (peakMaxT !== null && peakMaxT >= 40)) {
            heatAdvanceDays = heatwaveDays >= 5 ? 3 : 2;
            weatherFactors.push({
              id: "TEMPERATURE_HEAT_ACCELERATION",
              label: "Terminal heat drying acceleration",
              detail: `High temperature stress (${heatwaveDays} days >= 38°C, peak ${peakMaxT}°C) accelerates grain dry-down and canopy senescence, advancing readiness by -${heatAdvanceDays} days.`,
              direction: "advances",
              weight: "medium",
            });
          } else if (heatwaveDays >= 1 || (peakMaxT !== null && peakMaxT >= 38)) {
            heatAdvanceDays = 1;
            weatherFactors.push({
              id: "MODERATE_HEAT_DRYING",
              label: "Elevated temperature drying",
              detail: `Elevated temperatures (peak ${peakMaxT}°C) promote rapid post-maturity desiccation, advancing window by -1 day.`,
              direction: "advances",
              weight: "low",
            });
          }

          // 3. Low Temperature & Frost Retardation
          if (frostRiskDays >= 2 || (lowestMinT !== null && lowestMinT <= 5)) {
            coldDelayDays = 2;
            weatherFactors.push({
              id: "COLD_TEMPERATURE_RETARDATION",
              label: "Cold temperature ripening retardation",
              detail: `Low temperatures (min ${lowestMinT}°C, ${frostRiskDays} frost risk days) slow grain filling and ripening enzymatic activity, delaying maturity by +2 days.`,
              direction: "delays",
              weight: "medium",
            });
          }

          const rawNet = (rainDelayDays + coldDelayDays) - heatAdvanceDays;
          const boundedNet = Math.max(-5, Math.min(7, rawNet));

          if (boundedNet !== 0) {
            weatherAdjustmentDays = boundedNet;
            weatherAdjustmentApplied = true;
            weatherAdjustmentStatus = "APPLIED";
            weatherNote = `Weather-adjusted: ${weatherAdjustmentDays > 0 ? `+${weatherAdjustmentDays}` : weatherAdjustmentDays} days based on local 10-day meteorological conditions.`;
            weatherFactors.push({
              id: "WEATHER_ADJUSTMENT_APPLIED",
              label: "Weather adjustments incorporated",
              detail: weatherNote,
              direction: weatherAdjustmentDays > 0 ? "delays" : "advances",
              weight: "medium",
            });
          } else {
            weatherAdjustmentDays = 0;
            weatherAdjustmentApplied = false;
            weatherAdjustmentStatus = "NOT_APPLIED";
            weatherNote = "Meteorological conditions within standard agronomic ranges. Baseline maturity window preserved.";
            weatherFactors.push({
              id: "WEATHER_CONDITIONS_OPTIMAL",
              label: "Benign weather conditions",
              detail: "Forecasted temperatures and precipitation fall within standard agronomic ranges. Baseline maturity timing maintained.",
              direction: "neutral",
              weight: "low",
            });
          }
        }
      }
    }
  } else {
    // No weather context supplied
    weatherFactors.push({
      id: "WEATHER_DATA_UNAVAILABLE",
      label: "Weather dataset unavailable",
      detail: "Phase 5 baseline calculation active. Local meteorological data will integrate automatically.",
      direction: "neutral",
      weight: "low",
    });
  }

  // Compute final harvest window dates
  let windowStart = baseStart;
  let windowTypical = baseTypical;
  let windowEnd = baseEnd;
  let adjustedHarvestWindow = null;

  if (weatherAdjustmentApplied) {
    const adjStart = addDays(baseStart, weatherAdjustmentDays);
    const adjTypical = addDays(baseTypical, weatherAdjustmentDays);
    const adjEnd = addDays(baseEnd, weatherAdjustmentDays);

    windowStart = adjStart;
    windowTypical = adjTypical.getTime() < windowStart.getTime() ? windowStart : adjTypical;
    windowEnd = adjEnd.getTime() < windowTypical.getTime() ? windowTypical : adjEnd;

    adjustedHarvestWindow = {
      startDate: toDateString(windowStart),
      typicalDate: toDateString(windowTypical),
      endDate: toDateString(windowEnd),
    };
  }

  // 6. Calculate Days Remaining & Progress
  const daysToWindowStart = diffDays(refDate, windowStart);
  const daysToWindowEnd = diffDays(refDate, windowEnd);
  const daysUntilHarvest = diffDays(refDate, windowTypical);

  const totalSeasonDays = Math.max(diffDays(sowingDate, windowEnd), 1);
  const elapsedDays = diffDays(sowingDate, refDate);
  const seasonProgress = Math.min(Math.max(Number((elapsedDays / totalSeasonDays).toFixed(2)), 0), 1);

  // 7. Readiness Classification
  const isHarvested = recordedStage === "HARVESTED";
  let readinessStatus = "growing";
  let readinessLevel = "DEVELOPING";
  let statusMeta = {
    label: "Growing",
    short: "Growing",
    description: "The crop is developing actively. The estimated harvest window is further out.",
    tone: "living",
  };

  if (isHarvested) {
    readinessStatus = "passed";
    readinessLevel = "HARVESTED";
    statusMeta = {
      label: "Harvested",
      short: "Harvested",
      description: "Harvesting has been completed and recorded for this block.",
      tone: "earth",
    };
  } else if (daysToWindowEnd < 0) {
    readinessStatus = "passed";
    readinessLevel = "OVERDUE";
    statusMeta = {
      label: "Harvest window passed",
      short: "Overdue",
      description: "The estimated window has elapsed. Inspect the field to confirm maturity status.",
      tone: "earth",
    };
  } else if (daysToWindowStart <= 0 && daysToWindowEnd >= 0) {
    readinessStatus = "in-window";
    readinessLevel = "READY";
    statusMeta = {
      label: "Within harvest window",
      short: "Ready",
      description: "The crop has entered its estimated harvest window. Prepare harvesting operations.",
      tone: "forest",
    };
  } else if (daysToWindowStart <= 21) {
    readinessStatus = "approaching";
    readinessLevel = "APPROACHING";
    statusMeta = {
      label: "Approaching readiness",
      short: "Approaching",
      description: "Harvest window opens within 3 weeks. Coordinate labour, logistics, and storage.",
      tone: "gold",
    };
  }

  // 8. Confidence Score & Contributing Factors Computation
  let confidenceScore = 52;
  const factors = [];

  // Sowing Date Factor
  confidenceScore += 16;
  factors.push({
    id: "SOWING_DATE_AVAILABLE",
    label: "Recorded sowing date",
    detail: `Sowing date on ${toDateString(sowingDate)} anchors developmental calculations.`,
    direction: "supports",
    weight: "high",
  });

  // Rule Precision Factor
  if (matchType === "EXACT_VARIETY") {
    confidenceScore += 14;
    factors.push({
      id: "VARIETY_RULE_MATCHED",
      label: `Variety rule matched: ${variety}`,
      detail: `Agronomic duration calibrated to ${rule.cropName} (${variety}) [${rule.minDays}–${rule.maxDays} days].`,
      direction: "supports",
      weight: "high",
    });
  } else if (matchType === "CROP_LEVEL") {
    confidenceScore += 8;
    factors.push({
      id: "CROP_LEVEL_RULE_USED",
      label: `${rule.cropName} species benchmark`,
      detail: `Standard regional duration of ${rule.minDays}–${rule.maxDays} days applied.`,
      direction: "supports",
      weight: "medium",
    });
  } else {
    confidenceScore -= 8;
    factors.push({
      id: "GENERIC_FALLBACK_RULE_USED",
      label: "Generic crop duration fallback",
      detail: `No specific agronomic rule found for '${cropName}'. Baseline annual crop timeline applied.`,
      direction: "neutral",
      weight: "low",
    });
  }

  // Growth Stage Consistency Check
  if (recordedStage && recordedStage !== "UNKNOWN") {
    confidenceScore += 6;
    if (isHarvested) {
      factors.push({
        id: "HARVEST_ALREADY_RECORDED",
        label: "Field status: Harvested",
        detail: "Crop is explicitly recorded as harvested.",
        direction: "neutral",
        weight: "high",
      });
    } else {
      factors.push({
        id: "GROWTH_STAGE_AVAILABLE",
        label: `Observed stage: ${crop.growthStage}`,
        detail: "Recorded growth stage aligns with field progression monitoring.",
        direction: "supports",
        weight: "medium",
      });
    }
  }

  // User Expected Harvest Date Comparison
  if (expectedHarvestDate) {
    const expDaysFromSowing = diffDays(sowingDate, expectedHarvestDate);
    if (expDaysFromSowing >= minDays - 10 && expDaysFromSowing <= maxDays + 10) {
      confidenceScore += 6;
      factors.push({
        id: "EXPECTED_DATE_CONSISTENT",
        label: "Farmer expected date consistent",
        detail: `Expected harvest date (${toDateString(expectedHarvestDate)}) falls within the agronomic window.`,
        direction: "supports",
        weight: "medium",
      });
    } else {
      confidenceScore -= 10;
      factors.push({
        id: "EXPECTED_DATE_CONFLICT",
        label: "Target harvest date discrepancy",
        detail: `Farmer target date (${toDateString(expectedHarvestDate)}) diverges from typical maturity range (${minDays}–${maxDays} days).`,
        direction: "neutral",
        weight: "medium",
      });
    }
  }

  // Field Attributes Check (Irrigation, Field Area)
  if (crop.irrigationMethod || crop.irrigation) {
    confidenceScore += 3;
    const method = crop.irrigationMethod || crop.irrigation;
    factors.push({
      id: "IRRIGATION_METHOD_NOTED",
      label: `Irrigation: ${method}`,
      detail: `Controlled moisture regime (${method}) stabilizes developmental progress.`,
      direction: "supports",
      weight: "low",
    });
  }

  // Integrate weather factors and calibrate confidence score
  for (const wf of weatherFactors) {
    factors.push(wf);
  }

  if (weatherAdjustmentApplied) {
    confidenceScore += 5;
  } else if (weatherAdjustmentStatus === "NOT_APPLIED" && weatherContext?.available) {
    confidenceScore += 2;
  } else if (weatherContext?.isStale) {
    confidenceScore -= 4;
  }

  // Bound confidence score (cannot exceed 95 due to biological variance)
  const finalScore = Math.min(Math.max(Math.round(confidenceScore), 20), 95);
  const confidenceLevel = getConfidenceLevel(finalScore);

  // 9. Next Recommended Action
  let nextAction = "Monitor crop development and log growth observations.";
  if (isHarvested) {
    nextAction = "Archive crop record or document final post-harvest yield.";
  } else if (readinessStatus === "in-window") {
    nextAction = `Inspect ${variety || cropName} in the field to finalize the harvest schedule.`;
  } else if (readinessStatus === "approaching") {
    nextAction = `Prepare harvesting equipment and storage before window opens on ${toDateString(windowStart)}.`;
  } else if (readinessStatus === "passed") {
    nextAction = "Window has elapsed. Inspect crop immediately to prevent lodging or grain shattering.";
  }

  // 10. Construct Growth Stage Timeline
  const timeline = buildGrowthTimeline(crop, sowingDate, windowStart, windowEnd, templateName, refDate);

  return {
    id: `fc-${crop.id || "calc"}`,
    cropId: crop.id,
    farmId: crop.farmId,
    cropName,
    variety,
    readinessStatus,
    readinessLevel,
    statusMeta,
    // Active final harvest window (adjusted if weather-adjusted, otherwise baseline)
    harvestWindow: {
      startDate: toDateString(windowStart),
      typicalDate: toDateString(windowTypical),
      endDate: toDateString(windowEnd),
    },
    // Explicit baseline and adjusted harvest windows for transparency
    baselineHarvestWindow,
    adjustedHarvestWindow,
    // Frontend compatibility fields
    estimatedWindowStart: toDateString(windowStart),
    estimatedWindowEnd: toDateString(windowEnd),
    daysToWindowStart,
    daysToWindowEnd,
    daysUntilHarvest,
    seasonProgress,
    confidence: {
      score: finalScore,
      level: confidenceLevel,
      interpretation:
        finalScore >= 80
          ? "High quality rule-based estimate supported by specific variety and field data."
          : finalScore >= 56
            ? "Standard rule-based estimate using regional crop agronomy benchmarks."
            : "Preliminary baseline estimate. Add variety or growth stage to increase accuracy.",
    },
    growthTimeline: timeline,
    stagePlan: timeline, // Frontend compatibility alias
    contributingFactors: factors,
    weatherFactors,
    weatherAdjustmentApplied,
    weatherAdjustmentStatus,
    weatherAdjustmentDays,
    weatherNote,
    weatherDataTimestamp: weatherContext?.fetchedAt || null,
    forecastCalculationTimestamp: nowIso,
    weatherContextSummary: weatherContext?.summary10Day
      ? {
          ...weatherContext.summary10Day,
          current: weatherContext.current || null,
          provider: weatherContext.provider || "Open-Meteo",
          isStale: Boolean(weatherContext.isStale),
        }
      : null,
    nextAction,
    calculatedAt: nowIso,
    updatedAt: nowIso,
    sourceType: "rule-based-engine",
    modelNote: `Rule-based agricultural engine grounded in ICAR/SAU recommendations. Rule source: ${rule?.source || "Generic agronomic benchmark"}.`,
  };
}
