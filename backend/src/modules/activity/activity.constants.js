/**
 * Standard activity event types and mapping conventions.
 * Maps between backend SCREAMING_SNAKE_CASE and frontend kebab-case conventions.
 */
export const ACTIVITY_TYPES = {
  FARM_CREATED: "farm-added",
  FARM_UPDATED: "farm-updated",
  FARM_DELETED: "farm-deleted",
  CROP_CREATED: "crop-added",
  CROP_UPDATED: "crop-updated",
  CROP_DELETED: "crop-deleted",
  FORECAST_REFRESHED: "forecast-refreshed",
  WINDOW_CHANGED: "window-changed",
  RECOMMENDATION_GENERATED: "recommendation-generated",
  RECOMMENDATION_COMPLETED: "recommendation-completed",
  RECOMMENDATION_DISMISSED: "recommendation-dismissed",
  WEATHER_ALERT: "weather-alert",
  PROFILE_UPDATED: "profile-updated",
};

/**
 * Normalizes input event type to standard frontend kebab-case representation.
 *
 * @param {string} rawType
 * @returns {string}
 */
export function normalizeActivityType(rawType) {
  if (!rawType || typeof rawType !== "string") {
    return "activity";
  }

  const trimmed = rawType.trim();

  // If already mapped to frontend format
  if (Object.values(ACTIVITY_TYPES).includes(trimmed)) {
    return trimmed;
  }

  // If in UPPER_SNAKE_CASE format
  const upperKey = trimmed.toUpperCase().replace(/-/g, "_");
  if (ACTIVITY_TYPES[upperKey]) {
    return ACTIVITY_TYPES[upperKey];
  }

  return trimmed.toLowerCase().replace(/_/g, "-");
}
