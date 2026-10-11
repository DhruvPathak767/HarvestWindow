/**
 * Phase AI-8: Alert Rules Configuration
 * Centralized, deterministic thresholds and severity mappings for harvest, weather,
 * prediction changes, and crop health alerts.
 */

export const ALERT_SEVERITIES = {
  INFO: "info",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const ALERT_LIFECYCLES = {
  ACTIVE: "ACTIVE",
  RESOLVED: "RESOLVED",
  EXPIRED: "EXPIRED",
  SUPERSEDED: "SUPERSEDED",
};

export const ALERT_EVENT_TYPES = {
  HARVEST_WINDOW_APPROACHING: "harvest_window_approaching",
  HARVEST_WINDOW_OPEN: "harvest_window_open",
  HARVEST_WINDOW_CLOSING: "harvest_window_closing",
  WEATHER_RISK_ESCALATION: "weather_risk_escalation",
  WEATHER_RAIN_DURING_HARVEST: "weather_rain_during_harvest",
  PREDICTION_DATE_CHANGE: "prediction_date_change",
  PREDICTION_YIELD_CHANGE: "prediction_yield_change",
  CROP_HEALTH_CONCERN: "crop_health_concern",
  RECOMMENDATION_PRIORITY: "recommendation_priority",
};

export const ALERT_RULES_CONFIG = {
  harvest: {
    approachingDaysThreshold: 7, // Alert when harvest is within 7 days
    closingDaysThreshold: 3,     // Alert when harvest window has <= 3 days left
    maxStaleDays: 14,
  },
  weather: {
    rainPrecipThresholdMm: 5.0,  // Rain > 5mm during harvest window triggers warning
    windSpeedThresholdKph: 35.0, // Wind > 35 km/h triggers warning
    temperatureMaxC: 38.0,       // Heatwave caution
    escalationLevels: ["low", "medium", "high", "critical"],
  },
  predictionChange: {
    dateShiftDaysThreshold: 3,   // Alert if predicted harvest shift >= 3 days
    yieldShiftPercentThreshold: 10, // Alert if yield prediction shifts >= 10%
  },
  cropHealth: {
    minConfidenceThreshold: 0.50, // Flag disease predictions with >= 50% confidence
    healthyClassName: "healthy",
  },
  scheduler: {
    intervalMinutes: 15,          // Periodic evaluation interval
    dailyCleanupHourUtc: 3,      // Stale alert cleanup hour
  },
};
