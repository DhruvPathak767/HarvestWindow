import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { weatherCache } from "./weather.cache.js";
import { fetchWeatherForecast } from "./weather.provider.js";
import { generateWeatherWarnings } from "./weather.warnings.js";

/**
 * Retrieves weather for a specific farm owned by the authenticated user.
 * Validates ownership, checks geographic coordinates, uses cache when available,
 * and attaches agricultural harvest warnings.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} farmId - ID of the target farm
 * @param {Object} [options]
 */
export async function getWeatherForFarm(userId, farmId, options = {}) {
  if (!userId || typeof userId !== "string") {
    throw new AppError("Authentication required.", 401);
  }
  if (!farmId || typeof farmId !== "string") {
    throw new AppError("Valid farm ID is required.", 400);
  }

  // Retrieve farm from database ensuring user authorization
  const farm = await prisma.farm.findFirst({
    where: {
      id: farmId,
      userId,
    },
  });

  if (!farm) {
    throw new AppError("Farm not found or you do not have permission to access it.", 404);
  }

  const lat = farm.latitude !== null && farm.latitude !== undefined ? Number(farm.latitude) : null;
  const lon = farm.longitude !== null && farm.longitude !== undefined ? Number(farm.longitude) : null;

  if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new AppError(
      "Farm coordinates are missing. Please use 'Detect Location' or update coordinates for this farm to view weather.",
      400,
      "MISSING_COORDINATES"
    );
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new AppError("Saved farm coordinates are out of valid bounds.", 400);
  }

  // Check cache unless explicitly skipped
  let cachedEntry = options.forceRefresh ? null : weatherCache.get(lat, lon);

  if (!cachedEntry) {
    const normalized = await fetchWeatherForecast(lat, lon);
    const warnings = generateWeatherWarnings(normalized.dailyForecast);

    cachedEntry = weatherCache.set(lat, lon, {
      ...normalized,
      warnings,
    });
  }

  const weatherData = cachedEntry.data || cachedEntry;

  return {
    farm: {
      id: farm.id,
      name: farm.name,
      state: farm.state,
      district: farm.district,
      villageOrTaluka: farm.villageOrTaluka || null,
      latitude: lat,
      longitude: lon,
      area: Number(farm.area),
      areaUnit: farm.areaUnit === "ACRE" ? "acre" : "hectare",
    },
    current: weatherData.current,
    dailyForecast: weatherData.dailyForecast,
    warnings: weatherData.warnings || [],
    timezone: weatherData.timezone,
    elevationMeters: weatherData.elevationMeters || 0,
    provider: weatherData.provider || "Open-Meteo",
    fetchedAt: cachedEntry.fetchedAt || new Date().toISOString(),
    isCached: Boolean(cachedEntry.isCached),
  };
}

/**
 * Retrieves weather for standalone live device coordinates without persisting to a farm.
 *
 * @param {number} latitude
 * @param {number} longitude
 */
export async function getWeatherForCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new AppError("Latitude must be a valid number between -90 and 90.", 400);
  }
  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    throw new AppError("Longitude must be a valid number between -180 and 180.", 400);
  }

  let cachedEntry = weatherCache.get(lat, lon);

  if (!cachedEntry) {
    const normalized = await fetchWeatherForecast(lat, lon);
    const warnings = generateWeatherWarnings(normalized.dailyForecast);

    cachedEntry = weatherCache.set(lat, lon, {
      ...normalized,
      warnings,
    });
  }

  const weatherData = cachedEntry.data || cachedEntry;

  return {
    location: {
      latitude: lat,
      longitude: lon,
    },
    current: weatherData.current,
    dailyForecast: weatherData.dailyForecast,
    warnings: weatherData.warnings || [],
    timezone: weatherData.timezone,
    elevationMeters: weatherData.elevationMeters || 0,
    provider: weatherData.provider || "Open-Meteo",
    fetchedAt: cachedEntry.fetchedAt || new Date().toISOString(),
    isCached: Boolean(cachedEntry.isCached),
  };
}
