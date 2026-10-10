import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const DEFAULT_PREFERENCES = {
  areaUnit: "hectare",
  temperatureUnit: "celsius",
  language: "en",
  defaultFarmId: null,
  notifications: {
    harvestWindowAlerts: true,
    weatherCautions: true,
    weeklySummary: false,
  },
};

/**
 * Retrieves the authenticated user's profile and saved preferences.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ profile: Object, preferences: Object }>}
 */
export async function getSettings(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      settings: true,
    },
  });

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  const rawSettings = user.settings;

  const preferences = rawSettings
    ? {
        areaUnit: rawSettings.areaUnit,
        temperatureUnit: rawSettings.temperatureUnit,
        language: rawSettings.language,
        defaultFarmId: rawSettings.defaultFarmId,
        notifications: {
          harvestWindowAlerts: rawSettings.harvestWindowAlerts,
          weatherCautions: rawSettings.weatherCautions,
          weeklySummary: rawSettings.weeklySummary,
        },
      }
    : { ...DEFAULT_PREFERENCES };

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    preferences,
  };
}

/**
 * Updates the authenticated user's settings with validation of default farm ownership.
 *
 * @param {string} userId - Authenticated user ID
 * @param {Object} input - Validated patch input
 * @returns {Promise<{ profile: Object, preferences: Object }>}
 */
export async function updateSettings(userId, input) {
  // 1. Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  // 2. Validate defaultFarmId ownership if specified
  if (input.defaultFarmId !== undefined && input.defaultFarmId !== null) {
    const farm = await prisma.farm.findFirst({
      where: {
        id: input.defaultFarmId,
        userId,
      },
    });

    if (!farm) {
      throw new AppError(
        "Default farm not found or you do not have permission to select it.",
        400,
        "INVALID_DEFAULT_FARM"
      );
    }
  }

  // 3. Prepare data payload
  const updateData = {};
  if (input.areaUnit !== undefined) updateData.areaUnit = input.areaUnit;
  if (input.temperatureUnit !== undefined) updateData.temperatureUnit = input.temperatureUnit;
  if (input.language !== undefined) updateData.language = input.language;
  if (input.defaultFarmId !== undefined) updateData.defaultFarmId = input.defaultFarmId;

  if (input.notifications) {
    if (input.notifications.harvestWindowAlerts !== undefined) {
      updateData.harvestWindowAlerts = input.notifications.harvestWindowAlerts;
    }
    if (input.notifications.weatherCautions !== undefined) {
      updateData.weatherCautions = input.notifications.weatherCautions;
    }
    if (input.notifications.weeklySummary !== undefined) {
      updateData.weeklySummary = input.notifications.weeklySummary;
    }
  }

  // 4. Upsert user settings record in MySQL
  const savedSettings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...updateData,
    },
    update: updateData,
  });

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    preferences: {
      areaUnit: savedSettings.areaUnit,
      temperatureUnit: savedSettings.temperatureUnit,
      language: savedSettings.language,
      defaultFarmId: savedSettings.defaultFarmId,
      notifications: {
        harvestWindowAlerts: savedSettings.harvestWindowAlerts,
        weatherCautions: savedSettings.weatherCautions,
        weeklySummary: savedSettings.weeklySummary,
      },
    },
  };
}
