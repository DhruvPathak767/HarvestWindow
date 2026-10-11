/**
 * Phase AI-3: Weather Intelligence & Harvest Risk Constants
 * Standardized status enums, severity scales, and confidence definitions.
 */

export const HARVEST_SUITABILITY = Object.freeze({
  FAVORABLE: "FAVORABLE",
  CAUTION: "CAUTION",
  UNFAVORABLE: "UNFAVORABLE",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
});

export const URGENCY_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

export const CONFIDENCE_LEVEL = Object.freeze({
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
});

export const RISK_CATEGORY = Object.freeze({
  RAINFALL: "RAINFALL",
  HUMIDITY_DRYING: "HUMIDITY_DRYING",
  WIND: "WIND",
  TEMPERATURE: "TEMPERATURE",
  OPERATIONAL: "OPERATIONAL",
});

export const RISK_SEVERITY = Object.freeze({
  NONE: "NONE",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});
