/**
 * Production Estimation and Area Unit Normalization Service (Phase AI-5).
 */
import { AREA_TO_HECTARES, QUANTITY_TO_TONNES } from "./yield.constants.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * Normalizes any agricultural area input into canonical hectares.
 *
 * @param {number|string} areaValue
 * @param {string} areaUnit
 * @returns {number} area in hectares
 */
export function convertToHectares(areaValue, areaUnit = "HECTARE") {
  const num = Number(areaValue);
  if (isNaN(num) || num <= 0) {
    throw new AppError(`Planted area must be a strictly positive number (>0). Received: ${areaValue}`, 422);
  }

  const normalizedUnit = String(areaUnit || "HECTARE").trim().toUpperCase();
  const factor = AREA_TO_HECTARES[normalizedUnit];

  if (factor === undefined) {
    throw new AppError(
      `Unsupported area unit '${areaUnit}'. Supported units: ${Object.keys(AREA_TO_HECTARES).join(", ")}`,
      422
    );
  }

  return Number((num * factor).toFixed(6));
}

/**
 * Converts a harvested quantity into canonical metric tonnes.
 *
 * @param {number|string} quantity
 * @param {string} unit
 * @returns {number} quantity in metric tonnes
 */
export function convertToTonnes(quantity, unit = "TONNE") {
  const num = Number(quantity);
  if (isNaN(num) || num <= 0) {
    throw new AppError(`Harvest quantity must be a strictly positive number. Received: ${quantity}`, 422);
  }

  const normalizedUnit = String(unit || "TONNE").trim().toUpperCase();
  const factor = QUANTITY_TO_TONNES[normalizedUnit];

  if (factor === undefined) {
    throw new AppError(
      `Unsupported quantity unit '${unit}'. Supported units: ${Object.keys(QUANTITY_TO_TONNES).join(", ")}`,
      422
    );
  }

  return Number((num * factor).toFixed(4));
}

/**
 * Computes total expected production from predicted yield and planted area.
 * Formula:
 *   expectedProductionTonnes = predictedYieldTonnesPerHectare * areaHectares
 *
 * @param {Object} params
 * @param {number} params.yieldTonnesPerHectare
 * @param {number} params.areaValue
 * @param {string} [params.areaUnit]
 * @param {number} [params.lowerYield]
 * @param {number} [params.upperYield]
 * @returns {Object}
 */
export function estimateTotalProduction({
  yieldTonnesPerHectare,
  areaValue,
  areaUnit = "HECTARE",
  lowerYield = null,
  upperYield = null,
}) {
  const y = Number(yieldTonnesPerHectare);
  if (isNaN(y) || y <= 0) {
    throw new AppError(`Predicted yield must be a strictly positive number (>0). Received: ${yieldTonnesPerHectare}`, 422);
  }

  const areaHa = convertToHectares(areaValue, areaUnit);
  const expectedProductionTonnes = Number((y * areaHa).toFixed(4));

  let lowerProductionTonnes = null;
  let upperProductionTonnes = null;

  if (lowerYield !== null && lowerYield !== undefined) {
    const ly = Number(lowerYield);
    if (!isNaN(ly) && ly > 0) {
      lowerProductionTonnes = Number((ly * areaHa).toFixed(4));
    }
  }

  if (upperYield !== null && upperYield !== undefined) {
    const uy = Number(upperYield);
    if (!isNaN(uy) && uy > 0) {
      upperProductionTonnes = Number((uy * areaHa).toFixed(4));
    }
  }

  return {
    plantedAreaHectares: areaHa,
    originalAreaValue: Number(areaValue),
    originalAreaUnit: String(areaUnit).toUpperCase(),
    predictedYieldTonnesPerHectare: Number(y.toFixed(4)),
    expectedProductionTonnes,
    lowerProductionTonnes,
    upperProductionTonnes,
  };
}
