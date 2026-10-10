/**
 * WMO Weather Interpretation Codes (WW) mapping according to Open-Meteo specification.
 * Maps standard meteorological codes to human-readable labels, categorized conditions, and icon IDs.
 */
export const WMO_WEATHER_CODES = {
  0: { condition: "clear", label: "Clear sky", icon: "sun" },
  1: { condition: "partly-cloudy", label: "Mainly clear", icon: "cloud-sun" },
  2: { condition: "partly-cloudy", label: "Partly cloudy", icon: "cloud-sun" },
  3: { condition: "overcast", label: "Overcast", icon: "cloud" },
  45: { condition: "overcast", label: "Fog", icon: "cloud-fog" },
  48: { condition: "overcast", label: "Depositing rime fog", icon: "cloud-fog" },
  51: { condition: "rain", label: "Light drizzle", icon: "cloud-drizzle" },
  53: { condition: "rain", label: "Moderate drizzle", icon: "cloud-drizzle" },
  55: { condition: "rain", label: "Dense drizzle", icon: "cloud-drizzle" },
  56: { condition: "rain", label: "Light freezing drizzle", icon: "cloud-drizzle" },
  57: { condition: "rain", label: "Dense freezing drizzle", icon: "cloud-drizzle" },
  61: { condition: "rain", label: "Slight rain", icon: "cloud-rain" },
  63: { condition: "rain", label: "Moderate rain", icon: "cloud-rain" },
  65: { condition: "rain", label: "Heavy rain", icon: "cloud-rain" },
  66: { condition: "rain", label: "Light freezing rain", icon: "cloud-rain" },
  67: { condition: "rain", label: "Heavy freezing rain", icon: "cloud-rain" },
  71: { condition: "rain", label: "Slight snowfall", icon: "cloud-snow" },
  73: { condition: "rain", label: "Moderate snowfall", icon: "cloud-snow" },
  75: { condition: "rain", label: "Heavy snowfall", icon: "cloud-snow" },
  77: { condition: "rain", label: "Snow grains", icon: "cloud-snow" },
  80: { condition: "rain", label: "Slight rain showers", icon: "cloud-rain" },
  81: { condition: "rain", label: "Moderate rain showers", icon: "cloud-rain" },
  82: { condition: "rain", label: "Violent rain showers", icon: "cloud-rain" },
  85: { condition: "rain", label: "Slight snow showers", icon: "cloud-snow" },
  86: { condition: "rain", label: "Heavy snow showers", icon: "cloud-snow" },
  95: { condition: "storm", label: "Thunderstorm", icon: "cloud-lightning" },
  96: { condition: "storm", label: "Thunderstorm with slight hail", icon: "cloud-lightning" },
  99: { condition: "storm", label: "Thunderstorm with heavy hail", icon: "cloud-lightning" },
};

export const UNKNOWN_WEATHER_CODE = {
  condition: "partly-cloudy",
  label: "Moderate conditions",
  icon: "cloud-sun",
};

/**
 * Resolves WMO code into normalized status and description.
 *
 * @param {number|undefined|null} code
 * @returns {{ condition: string, label: string, icon: string }}
 */
export function resolveWeatherCode(code) {
  if (code === undefined || code === null) return UNKNOWN_WEATHER_CODE;
  const num = Number(code);
  return WMO_WEATHER_CODES[num] || UNKNOWN_WEATHER_CODE;
}

/**
 * Configurable agricultural warning thresholds.
 */
export const DEFAULT_WARNING_THRESHOLDS = {
  // Rainfall thresholds
  HEAVY_RAIN_MM: 20, // >= 20 mm in a single day is HIGH risk for harvesting
  MODERATE_RAIN_MM: 10, // >= 10 mm in a single day is MEDIUM risk
  HIGH_RAIN_PROBABILITY_PCT: 75, // >= 75% chance of precipitation with rain > 3mm
  WET_SPELL_CONSECUTIVE_DAYS: 3, // 3+ days with rain >= 5mm
  WET_SPELL_MIN_RAIN_MM: 5,
  DRY_SPELL_CONSECUTIVE_DAYS: 7, // 7+ days with 0mm rain during high heat

  // Temperature thresholds
  HEAT_HIGH_C: 38, // >= 38°C extreme heat warning
  HEAT_MODERATE_C: 35, // >= 35°C high temperature alert
  COLD_SEVERE_C: 5, // <= 5°C frost/severe cold alert
  COLD_MODERATE_C: 10, // <= 10°C low temperature caution
};
