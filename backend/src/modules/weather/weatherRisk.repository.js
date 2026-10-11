import prisma from "../../config/prisma.js";

/**
 * Persists a weather risk assessment snapshot to MySQL using Prisma.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} farmId - Associated Farm ID
 * @param {string|null} cropId - Associated Crop ID
 * @param {Object} assessment - Risk assessment output from weatherRisk.engine.js
 * @returns {Promise<Object>} Created assessment database record
 */
export async function saveWeatherAssessment(userId, farmId, cropId, assessment) {
  const rainfallRisk = assessment.risks.find((r) => r.category === "RAINFALL");
  const humidityRisk = assessment.risks.find((r) => r.category === "HUMIDITY_DRYING");
  const windRisk = assessment.risks.find((r) => r.category === "WIND");
  const tempRisk = assessment.risks.find((r) => r.category === "TEMPERATURE");

  const record = await prisma.weatherAssessment.create({
    data: {
      userId,
      farmId,
      cropId: cropId || null,
      overallRiskScore: assessment.overallRiskScore,
      harvestSuitability: assessment.harvestSuitability,
      urgency: assessment.urgency,
      confidence: assessment.confidence,
      rainfallRiskScore: rainfallRisk ? rainfallRisk.score : 0,
      humidityRiskScore: humidityRisk ? humidityRisk.score : 0,
      windRiskScore: windRisk ? windRisk.score : 0,
      temperatureRiskScore: tempRisk ? tempRisk.score : 0,
      harvestWindowStart: assessment.harvestWindow?.start ? new Date(assessment.harvestWindow.start) : null,
      harvestWindowEnd: assessment.harvestWindow?.end ? new Date(assessment.harvestWindow.end) : null,
      forecastCoverageStart: assessment.forecastCoverage?.start ? new Date(assessment.forecastCoverage.start) : null,
      forecastCoverageEnd: assessment.forecastCoverage?.end ? new Date(assessment.forecastCoverage.end) : null,
      risksJson: JSON.stringify(assessment.risks || []),
      recommendationsJson: JSON.stringify(assessment.recommendations || []),
      explanationJson: JSON.stringify(assessment.explanation || []),
      dataQualityJson: JSON.stringify(assessment.dataQuality || {}),
      sourceProvider: assessment.source?.provider || "Open-Meteo",
      sourceFetchedAt: assessment.source?.fetchedAt ? new Date(assessment.source.fetchedAt) : new Date(),
    },
  });

  return record;
}

/**
 * Retrieves the latest stored weather assessment for a crop.
 *
 * @param {string} cropId
 * @returns {Promise<Object|null>}
 */
export async function findLatestAssessmentForCrop(cropId) {
  const row = await prisma.weatherAssessment.findFirst({
    where: { cropId },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return null;

  return deserializeAssessmentRow(row);
}

/**
 * Retrieves the latest stored weather assessment for a farm.
 *
 * @param {string} farmId
 * @returns {Promise<Object|null>}
 */
export async function findLatestAssessmentForFarm(farmId) {
  const row = await prisma.weatherAssessment.findFirst({
    where: { farmId },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return null;

  return deserializeAssessmentRow(row);
}

/**
 * Safely deserializes JSON columns into objects.
 */
function deserializeAssessmentRow(row) {
  let risks = [];
  let recommendations = [];
  let explanation = [];
  let dataQuality = {};

  try {
    if (row.risksJson) risks = JSON.parse(row.risksJson);
  } catch {
    risks = [];
  }

  try {
    if (row.recommendationsJson) recommendations = JSON.parse(row.recommendationsJson);
  } catch {
    recommendations = [];
  }

  try {
    if (row.explanationJson) explanation = JSON.parse(row.explanationJson);
  } catch {
    explanation = [];
  }

  try {
    if (row.dataQualityJson) dataQuality = JSON.parse(row.dataQualityJson);
  } catch {
    dataQuality = {};
  }

  return {
    id: row.id,
    userId: row.userId,
    farmId: row.farmId,
    cropId: row.cropId,
    overallRiskScore: row.overallRiskScore,
    harvestSuitability: row.harvestSuitability,
    urgency: row.urgency,
    confidence: row.confidence,
    harvestWindow:
      row.harvestWindowStart && row.harvestWindowEnd
        ? {
            start: row.harvestWindowStart.toISOString().slice(0, 10),
            end: row.harvestWindowEnd.toISOString().slice(0, 10),
          }
        : null,
    forecastCoverage:
      row.forecastCoverageStart && row.forecastCoverageEnd
        ? {
            start: row.forecastCoverageStart.toISOString(),
            end: row.forecastCoverageEnd.toISOString(),
          }
        : null,
    risks,
    recommendations,
    explanation,
    dataQuality,
    source: {
      provider: row.sourceProvider,
      fetchedAt: row.sourceFetchedAt.toISOString(),
    },
    createdAt: row.createdAt.toISOString(),
  };
}
