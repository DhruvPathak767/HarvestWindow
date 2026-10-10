import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * Normalizes a Prisma Crop model into the API contract expected by both
 * the Phase 3 specification and the existing frontend components.
 */
export function formatCrop(crop) {
  if (!crop) return null;

  const sowingDateIso =
    crop.sowingDate instanceof Date
      ? crop.sowingDate.toISOString()
      : crop.sowingDate;
  const sowingDateShort =
    typeof sowingDateIso === "string" ? sowingDateIso.slice(0, 10) : sowingDateIso;

  const harvestDateIso =
    crop.expectedHarvestDate instanceof Date
      ? crop.expectedHarvestDate.toISOString()
      : crop.expectedHarvestDate || null;
  const harvestDateShort =
    typeof harvestDateIso === "string" ? harvestDateIso.slice(0, 10) : harvestDateIso;

  return {
    id: crop.id,
    farmId: crop.farmId,
    cropName: crop.cropName,
    name: crop.cropName, // Compatibility with existing frontend models
    variety: crop.variety || null,
    sowingDate: sowingDateShort,
    plantingDate: sowingDateShort, // Compatibility with existing frontend components
    expectedHarvestDate: harvestDateShort,
    growthStage: crop.growthStage || null,
    irrigationMethod: crop.irrigationMethod || null,
    irrigation: crop.irrigationMethod || null, // Compatibility with existing frontend
    irrigationFrequency: crop.irrigationFrequency || null,
    fieldArea:
      crop.fieldArea !== null && crop.fieldArea !== undefined
        ? Number(crop.fieldArea)
        : null,
    expectedYield: crop.expectedYield || null,
    notes: crop.notes || null,
    createdAt:
      crop.createdAt instanceof Date
        ? crop.createdAt.toISOString()
        : crop.createdAt,
    updatedAt:
      crop.updatedAt instanceof Date
        ? crop.updatedAt.toISOString()
        : crop.updatedAt,
    farm: crop.farm
      ? {
          id: crop.farm.id,
          name: crop.farm.name,
          state: crop.farm.state,
          district: crop.farm.district,
        }
      : undefined,
  };
}

/**
 * Retrieves all crops accessible to the authenticated user with optional filtering.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Object} filters - Query filters (farmId, cropName, variety, growthStage, search, page, limit)
 */
export async function listCrops(userId, filters = {}) {
  const where = {
    farm: {
      userId,
    },
  };

  if (filters.farmId) {
    where.farmId = filters.farmId;
  }

  const nameFilter = filters.cropName || filters.name;
  if (nameFilter) {
    where.cropName = { contains: nameFilter };
  }

  if (filters.variety) {
    where.variety = { contains: filters.variety };
  }

  if (filters.growthStage) {
    where.growthStage = filters.growthStage;
  }

  if (filters.search) {
    where.OR = [
      { cropName: { contains: filters.search } },
      { variety: { contains: filters.search } },
    ];
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const skip = (page - 1) * limit;

  const records = await prisma.crop.findMany({
    where,
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  return records.map(formatCrop);
}

/**
 * Retrieves a single crop by its ID if it belongs to a farm owned by the user.
 *
 * @param {string} userId
 * @param {string} cropId
 */
export async function getCropById(userId, cropId) {
  const crop = await prisma.crop.findFirst({
    where: {
      id: cropId,
      farm: {
        userId,
      },
    },
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
        },
      },
    },
  });

  return formatCrop(crop);
}

/**
 * Creates a new crop associated with an existing farm owned by the user.
 *
 * @param {string} userId
 * @param {Object} input
 */
export async function createCrop(userId, input) {
  // 1. Verify farm exists
  const farm = await prisma.farm.findUnique({
    where: { id: input.farmId },
  });

  if (!farm) {
    throw new AppError("Referenced farm does not exist.", 404);
  }

  // 2. Verify farm ownership
  if (farm.userId !== userId) {
    throw new AppError(
      "Forbidden: You do not have permission to add crops to this farm.",
      403
    );
  }

  // 3. Resolve field values with frontend backward compatibility
  const cropName = input.cropName || input.name;
  const rawSowing = input.sowingDate || input.plantingDate;
  const sowingDate = rawSowing instanceof Date ? rawSowing : new Date(rawSowing);

  let expectedHarvestDate = null;
  if (input.expectedHarvestDate) {
    expectedHarvestDate =
      input.expectedHarvestDate instanceof Date
        ? input.expectedHarvestDate
        : new Date(input.expectedHarvestDate);
  }

  // 4. Validate date logic
  if (expectedHarvestDate && expectedHarvestDate < sowingDate) {
    throw new AppError(
      "Expected harvest date cannot be earlier than sowing date.",
      400
    );
  }

  const irrigationMethod = input.irrigationMethod || input.irrigation || null;

  // 5. Create crop in database
  const created = await prisma.crop.create({
    data: {
      farmId: input.farmId,
      cropName,
      variety: input.variety || null,
      sowingDate,
      expectedHarvestDate,
      growthStage: input.growthStage || null,
      irrigationMethod,
      irrigationFrequency: input.irrigationFrequency || null,
      fieldArea: input.fieldArea !== undefined && input.fieldArea !== null ? input.fieldArea : null,
      expectedYield: input.expectedYield || null,
      notes: input.notes || null,
    },
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
        },
      },
    },
  });

  return formatCrop(created);
}

/**
 * Updates an existing crop record. Enforces ownership and date consistency.
 *
 * @param {string} userId
 * @param {string} cropId
 * @param {Object} input
 */
export async function updateCrop(userId, cropId, input) {
  // 1. Verify existing crop and ownership
  const existing = await prisma.crop.findUnique({
    where: { id: cropId },
    include: { farm: true },
  });

  if (!existing) {
    throw new AppError("Crop not found.", 404);
  }

  if (existing.farm.userId !== userId) {
    throw new AppError(
      "Forbidden: You do not have permission to manage this crop.",
      403
    );
  }

  // 2. If farmId is being changed, verify destination farm ownership
  if (input.farmId && input.farmId !== existing.farmId) {
    const targetFarm = await prisma.farm.findUnique({
      where: { id: input.farmId },
    });

    if (!targetFarm) {
      throw new AppError("Destination farm does not exist.", 404);
    }

    if (targetFarm.userId !== userId) {
      throw new AppError(
        "Forbidden: You do not have permission to transfer crop to this farm.",
        403
      );
    }
  }

  // 3. Resolve and validate dates against existing values
  const rawSowing = input.sowingDate !== undefined ? input.sowingDate : input.plantingDate;
  const newSowing =
    rawSowing !== undefined
      ? rawSowing instanceof Date
        ? rawSowing
        : new Date(rawSowing)
      : existing.sowingDate;

  let newHarvest = existing.expectedHarvestDate;
  if (input.expectedHarvestDate !== undefined) {
    newHarvest =
      input.expectedHarvestDate !== null
        ? input.expectedHarvestDate instanceof Date
          ? input.expectedHarvestDate
          : new Date(input.expectedHarvestDate)
        : null;
  }

  if (newHarvest && newHarvest < newSowing) {
    throw new AppError(
      "Expected harvest date cannot be earlier than sowing date.",
      400
    );
  }

  // 4. Construct update payload
  const updateData = {};
  if (input.farmId !== undefined) updateData.farmId = input.farmId;
  if (input.cropName !== undefined) updateData.cropName = input.cropName;
  else if (input.name !== undefined) updateData.cropName = input.name;

  if (input.variety !== undefined) updateData.variety = input.variety;
  if (rawSowing !== undefined) updateData.sowingDate = newSowing;
  if (input.expectedHarvestDate !== undefined) updateData.expectedHarvestDate = newHarvest;
  if (input.growthStage !== undefined) updateData.growthStage = input.growthStage;

  if (input.irrigationMethod !== undefined) updateData.irrigationMethod = input.irrigationMethod;
  else if (input.irrigation !== undefined) updateData.irrigationMethod = input.irrigation;

  if (input.irrigationFrequency !== undefined) updateData.irrigationFrequency = input.irrigationFrequency;
  if (input.fieldArea !== undefined) updateData.fieldArea = input.fieldArea;
  if (input.expectedYield !== undefined) updateData.expectedYield = input.expectedYield;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const updated = await prisma.crop.update({
    where: { id: cropId },
    data: updateData,
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
        },
      },
    },
  });

  return formatCrop(updated);
}

/**
 * Deletes a crop owned by the authenticated user.
 * Preserves the associated farm.
 *
 * @param {string} userId
 * @param {string} cropId
 */
export async function deleteCrop(userId, cropId) {
  const existing = await prisma.crop.findUnique({
    where: { id: cropId },
    include: { farm: true },
  });

  if (!existing) {
    throw new AppError("Crop not found.", 404);
  }

  if (existing.farm.userId !== userId) {
    throw new AppError(
      "Forbidden: You do not have permission to delete this crop.",
      403
    );
  }

  await prisma.crop.delete({
    where: { id: cropId },
  });

  return true;
}
