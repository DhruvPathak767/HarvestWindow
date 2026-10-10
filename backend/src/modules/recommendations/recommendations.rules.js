/**
 * Agricultural Recommendation Rule Engine (Phase 6)
 *
 * Deterministic, rule-based recommendation generator using real farm,
 * crop, and weather forecast data.
 *
 * Supported frontend categories: "weather" | "timing" | "logistics" | "monitoring"
 * Supported frontend priorities: "high" | "medium" | "low"
 * Supported frontend statuses:   "open" | "completed" | "dismissed"
 */

/**
 * Calculates day difference between two dates (dateA - dateB) in calendar days.
 * @param {Date|string} dateA
 * @param {Date|string} dateB
 * @returns {number}
 */
export function differenceInCalendarDays(dateA, dateB) {
  const d1 = new Date(dateA);
  const d2 = new Date(dateB);
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Date object or date string into a user-friendly label (e.g. "Oct 15, 2026").
 * @param {Date|string} date
 * @returns {string}
 */
function formatDateLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Evaluates all agricultural rules for a single crop within a farm context.
 *
 * @param {Object} params
 * @param {Object} params.farm - Farm data (id, name, soilType, irrigationSource, etc.)
 * @param {Object} params.crop - Crop data (id, cropName, variety, sowingDate, expectedHarvestDate, growthStage, etc.)
 * @param {Object|null} [params.weather] - Weather data with dailyForecast, or null if unavailable
 * @param {Date} [params.referenceDate] - Date used as "now" (defaults to current system time)
 * @returns {Array<Object>} List of candidate recommendations
 */
export function evaluateCropRules({ farm, crop, weather = null, forecast = null, referenceDate = new Date() }) {
  if (!crop || !farm) {
    return [];
  }

  const candidates = [];
  const dailyForecast = Array.isArray(weather?.dailyForecast) ? weather.dailyForecast : [];

  // =========================================================================
  // Rule A1: Irrigation Pause Ahead of Expected Rainfall
  // =========================================================================
  if (dailyForecast.length > 0) {
    const upcoming3Days = dailyForecast.slice(0, 3);
    const sumRainfall3Days = upcoming3Days.reduce(
      (acc, day) => acc + (Number(day.rainfallMm) || 0),
      0
    );

    if (sumRainfall3Days >= 15) {
      const firstRainy = upcoming3Days.find((d) => (Number(d.rainfallMm) || 0) >= 5) || upcoming3Days[0];
      candidates.push({
        ruleKey: `irrigation-rain-pause-${crop.id}`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Pause irrigation for ${crop.cropName} ahead of expected rainfall`,
        reason: `Forecast projects approximately ${sumRainfall3Days.toFixed(0)} mm of rainfall over the next 48-72 hours. Holding planned irrigation reduces waterlogging risk, nutrient leaching, and pumping energy costs.`,
        suggestedAction: `Hold or dial down scheduled irrigation cycles. Re-inspect soil moisture after the rain event before resuming.`,
        category: "weather",
        priority: sumRainfall3Days >= 30 ? "high" : "medium",
        relevantDate: firstRainy?.date ? new Date(firstRainy.date) : null,
        sourceContext: JSON.stringify({
          rule: "Rule A1 - Rain Pause",
          sumRainfall3Days,
          firstRainDate: firstRainy?.date,
        }),
      });
    }
  }

  // =========================================================================
  // Rule A2: Dry Spell & Soil Moisture Monitoring
  // =========================================================================
  if (dailyForecast.length >= 3) {
    const next5Days = dailyForecast.slice(0, 5);
    const totalRain5Days = next5Days.reduce(
      (acc, day) => acc + (Number(day.rainfallMm) || 0),
      0
    );
    const avgMaxTemp =
      next5Days.reduce((acc, day) => acc + (Number(day.maxTempC) || 0), 0) / next5Days.length;

    // Trigger if rain is less than 3mm and average daytime max temp >= 30°C
    if (totalRain5Days < 3 && avgMaxTemp >= 30) {
      candidates.push({
        ruleKey: `irrigation-dry-spell-${crop.id}`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Monitor soil moisture and irrigation for ${crop.cropName}`,
        reason: `Extended dry period forecast over the next 5 days (less than 3 mm expected rain, daytime highs averaging ${avgMaxTemp.toFixed(0)}°C). The ${crop.growthStage || "current"} stage requires reliable root-zone moisture.`,
        suggestedAction: `Inspect root-zone soil moisture at 10-15 cm depth. Irrigate in early morning or evening hours to minimize evaporative losses.`,
        category: "monitoring",
        priority: "medium",
        relevantDate: null,
        sourceContext: JSON.stringify({
          rule: "Rule A2 - Dry Spell",
          totalRain5Days,
          avgMaxTemp,
        }),
      });
    }
  }

  // =========================================================================
  // Rule B: Heavy Rainfall and Waterlogging Risk
  // =========================================================================
  if (dailyForecast.length > 0) {
    // Check for single day heavy rain (>= 35mm) or 3-day window (>= 55mm)
    const severeRainDay = dailyForecast.find((d) => (Number(d.rainfallMm) || 0) >= 35);
    if (severeRainDay) {
      const rainMm = Number(severeRainDay.rainfallMm).toFixed(0);
      candidates.push({
        ruleKey: `heavy-rain-${crop.id}-${severeRainDay.date}`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Heavy rainfall alert: Clear field drainage for ${crop.cropName}`,
        reason: `Forecast projects heavy downpours up to ${rainMm} mm on ${severeRainDay.date}. Excess standing water in ${farm.name || "the field"} can saturate roots and encourage fungal pathogens in ${farm.soilType || "the"} soil.`,
        suggestedAction: `Inspect and clear perimeter drainage furrows and ditch exits. Avoid moving heavy machinery across water-saturated beds.`,
        category: "weather",
        priority: "high",
        relevantDate: new Date(severeRainDay.date),
        sourceContext: JSON.stringify({
          rule: "Rule B - Heavy Rainfall",
          date: severeRainDay.date,
          rainfallMm: severeRainDay.rainfallMm,
        }),
      });
    }
  }

  // =========================================================================
  // Rule C: High-Temperature / Heat Stress Risk
  // =========================================================================
  if (dailyForecast.length > 0) {
    const heatStressDay = dailyForecast.find(
      (d) =>
        (Number(d.maxTempC) || 0) >= 38 ||
        ((Number(d.maxTempC) || 0) >= 36 && (Number(d.humidity) || 100) < 35)
    );

    if (heatStressDay) {
      const tempC = Number(heatStressDay.maxTempC).toFixed(0);
      candidates.push({
        ruleKey: `heat-stress-${crop.id}-${heatStressDay.date}`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Heat stress watch for ${crop.cropName}`,
        reason: `Extreme temperatures reaching ${tempC}°C forecast on ${heatStressDay.date}. Severe thermal stress can cause leaf scorch, moisture deficit, and blossom drop in ${crop.cropName}.`,
        suggestedAction: `Ensure adequate root-zone moisture before peak afternoon heat. Avoid mid-day foliar chemical sprays during peak temperature hours.`,
        category: "weather",
        priority: Number(heatStressDay.maxTempC) >= 40 ? "high" : "medium",
        relevantDate: new Date(heatStressDay.date),
        sourceContext: JSON.stringify({
          rule: "Rule C - Heat Stress",
          date: heatStressDay.date,
          maxTempC: heatStressDay.maxTempC,
        }),
      });
    }
  }

  // =========================================================================
  // Rule D & E: Harvest Forecast / Readiness (Integrating Phase 5 Prediction Engine)
  // =========================================================================
  const isForecastReady =
    forecast?.readinessStatus === "READY" ||
    forecast?.readinessLevel === "READY";
  const isForecastApproaching =
    forecast?.readinessStatus === "APPROACHING" ||
    (typeof forecast?.daysToWindowStart === "number" &&
      forecast.daysToWindowStart >= 3 &&
      forecast.daysToWindowStart <= 10);

  if (isForecastReady) {
    const targetDate =
      forecast?.harvestWindow?.typicalDate ||
      forecast?.harvestWindow?.startDate ||
      crop.expectedHarvestDate;
    candidates.push({
      ruleKey: `harvest-ready-${crop.id}`,
      cropId: crop.id,
      farmId: farm.id,
      title: `Confirm harvest readiness for ${crop.cropName}`,
      reason: `Harvest prediction engine assesses readiness status as READY based on agronomic benchmarks and weather signals (${targetDate ? formatDateLabel(targetDate) : "current window"}). In-field verification is essential.`,
      suggestedAction: `Conduct in-field maturity inspection across multiple quadrants. If mature, coordinate immediate picking and market dispatch.`,
      category: "timing",
      priority: "high",
      relevantDate: targetDate ? new Date(targetDate) : null,
      sourceContext: JSON.stringify({
        rule: "Rule E - Prediction Engine Readiness",
        readinessStatus: forecast?.readinessStatus,
        confidence: forecast?.confidence,
      }),
    });
  } else if (isForecastApproaching) {
    const daysLeft =
      forecast?.daysToWindowStart ??
      (crop.expectedHarvestDate ? differenceInCalendarDays(crop.expectedHarvestDate, referenceDate) : 5);
    const targetDate =
      forecast?.harvestWindow?.startDate ||
      crop.expectedHarvestDate;
    candidates.push({
      ruleKey: `harvest-approaching-${crop.id}`,
      cropId: crop.id,
      farmId: farm.id,
      title: `Harvest window approaching for ${crop.cropName} (${daysLeft} days remaining)`,
      reason: `Prediction engine forecasts harvest window opening around ${targetDate ? formatDateLabel(targetDate) : "upcoming days"}. Crop is entering final ripening phase.`,
      suggestedAction: `Confirm harvesting labor, clean transport crates and storage areas, and conduct sample maturity testing across field quadrants.`,
      category: "timing",
      priority: daysLeft <= 5 ? "high" : "medium",
      relevantDate: targetDate ? new Date(targetDate) : null,
      sourceContext: JSON.stringify({
        rule: "Rule D - Prediction Engine Approaching",
        daysToWindowStart: daysLeft,
        confidence: forecast?.confidence,
      }),
    });
  } else if (crop.expectedHarvestDate) {
    // Fallback based on recorded expected harvest date when forecast engine prediction is not ready/approaching
    const daysUntilHarvest = differenceInCalendarDays(crop.expectedHarvestDate, referenceDate);

    if (daysUntilHarvest >= 3 && daysUntilHarvest <= 10) {
      candidates.push({
        ruleKey: `harvest-approaching-${crop.id}`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Harvest window approaching for ${crop.cropName} (${daysUntilHarvest} days remaining)`,
        reason: `Estimated harvest date is ${formatDateLabel(crop.expectedHarvestDate)}. Crop is entering final pre-harvest ripening phase.`,
        suggestedAction: `Confirm harvesting labor, clean transport crates and storage areas, and conduct sample maturity testing across field quadrants.`,
        category: "timing",
        priority: daysUntilHarvest <= 5 ? "high" : "medium",
        relevantDate: new Date(crop.expectedHarvestDate),
        sourceContext: JSON.stringify({
          rule: "Rule D - Harvest Approaching",
          daysUntilHarvest,
          expectedHarvestDate: crop.expectedHarvestDate,
        }),
      });
    }

    if (daysUntilHarvest <= 2 && daysUntilHarvest >= -7) {
      candidates.push({
        ruleKey: `harvest-ready-${crop.id}`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Confirm harvest readiness for ${crop.cropName}`,
        reason: `Crop has reached the expected harvest date (${formatDateLabel(crop.expectedHarvestDate)}). Field inspection is essential to verify actual maturity and moisture before harvest.`,
        suggestedAction: `Conduct in-field maturity inspection across multiple quadrants. If mature, coordinate immediate picking and market dispatch.`,
        category: "timing",
        priority: "high",
        relevantDate: new Date(crop.expectedHarvestDate),
        sourceContext: JSON.stringify({
          rule: "Rule E - Harvest Readiness",
          daysUntilHarvest,
          expectedHarvestDate: crop.expectedHarvestDate,
        }),
      });
    }
  }

  // =========================================================================
  // Rule F: Crop Growth Stage Monitoring
  // =========================================================================
  if (crop.growthStage && typeof crop.growthStage === "string") {
    const stage = crop.growthStage.toLowerCase().trim();

    if (stage.includes("flower") || stage.includes("bloom")) {
      candidates.push({
        ruleKey: `stage-monitoring-${crop.id}-flowering`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Flowering canopy inspection for ${crop.cropName}`,
        reason: `Crop is in the flowering phase, which is critical for pollination and fruit set. Moisture deficit or pests at this stage directly reduce yield.`,
        suggestedAction: `Inspect crop canopy for uniform blossom set and check for signs of flower thrips or fungal blight without disrupting beneficial pollinators.`,
        category: "monitoring",
        priority: "medium",
        relevantDate: null,
        sourceContext: JSON.stringify({
          rule: "Rule F - Flowering Stage",
          growthStage: crop.growthStage,
        }),
      });
    } else if (
      stage.includes("germinat") ||
      stage.includes("seedling") ||
      stage.includes("emergence")
    ) {
      candidates.push({
        ruleKey: `stage-monitoring-${crop.id}-seedling`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Assess seedling emergence rate for ${crop.cropName}`,
        reason: `Crop is in the early emergence/seedling stage where stand density and uniform root establishment determine final crop population.`,
        suggestedAction: `Check stand density per row-meter and inspect seedling bases for soil crusting or damping-off signs.`,
        category: "monitoring",
        priority: "low",
        relevantDate: null,
        sourceContext: JSON.stringify({
          rule: "Rule F - Seedling Stage",
          growthStage: crop.growthStage,
        }),
      });
    } else if (
      stage.includes("pod") ||
      stage.includes("grain") ||
      stage.includes("fruit") ||
      stage.includes("matur")
    ) {
      candidates.push({
        ruleKey: `stage-monitoring-${crop.id}-fruiting`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Monitor fruit/grain development for ${crop.cropName}`,
        reason: `Fruit and grain filling requires steady root-zone moisture and protection against lodging and pest punctures.`,
        suggestedAction: `Inspect sample pods/fruit across field margins for uniform sizing and signs of pest punctures.`,
        category: "monitoring",
        priority: "medium",
        relevantDate: null,
        sourceContext: JSON.stringify({
          rule: "Rule F - Fruiting Stage",
          growthStage: crop.growthStage,
        }),
      });
    } else if (
      stage.includes("vegetat") ||
      stage.includes("tiller") ||
      stage.includes("branch")
    ) {
      candidates.push({
        ruleKey: `stage-monitoring-${crop.id}-vegetative`,
        cropId: crop.id,
        farmId: farm.id,
        title: `Vegetative growth & canopy check for ${crop.cropName}`,
        reason: `Crop is actively expanding foliage and developing root structures in the vegetative stage.`,
        suggestedAction: `Inspect stem thickness and leaf color for nutrient balance; remove competing weeds along crop rows.`,
        category: "monitoring",
        priority: "low",
        relevantDate: null,
        sourceContext: JSON.stringify({
          rule: "Rule F - Vegetative Stage",
          growthStage: crop.growthStage,
        }),
      });
    }
  }

  // =========================================================================
  // Rule G: Missing Data Resilience (e.g. Missing Harvest Date)
  // =========================================================================
  if (!crop.expectedHarvestDate) {
    candidates.push({
      ruleKey: `missing-harvest-date-${crop.id}`,
      cropId: crop.id,
      farmId: farm.id,
      title: `Configure target harvest date for ${crop.cropName}`,
      reason: `No expected harvest date has been set for this crop. Without a target date, predictive harvest window alerts and pre-harvest logistics cannot activate.`,
      suggestedAction: `Estimate harvest date based on ${crop.cropName} maturity cycle and update the crop record.`,
      category: "monitoring",
      priority: "low",
      relevantDate: null,
      sourceContext: JSON.stringify({
        rule: "Rule G - Missing Harvest Date",
        sowingDate: crop.sowingDate,
      }),
    });
  }

  return candidates;
}
