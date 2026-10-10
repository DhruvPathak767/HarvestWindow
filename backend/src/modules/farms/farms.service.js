import prisma from "../../config/prisma.js";

/**
 * Normalizes a Prisma Farm model into the API contract expected by the frontend.
 * Ensures Decimal types are mapped to JavaScript numbers and dates to ISO 8601 strings.
 */
export function formatFarm(farm) {
  if (!farm) return null;
  return {
    id: farm.id,
    name: farm.name,
    state: farm.state,
    district: farm.district,
    soilType: farm.soilType || null,
    irrigationSource: farm.irrigationSource || null,
    village: farm.village || null,
    pincode: farm.pincode || null,
    latitude:
      farm.latitude !== null && farm.latitude !== undefined
        ? Number(farm.latitude)
        : null,
    longitude:
      farm.longitude !== null && farm.longitude !== undefined
        ? Number(farm.longitude)
        : null,
    area: Number(farm.area),
    areaUnit: farm.areaUnit,
    notes: farm.notes || null,
    createdAt:
      farm.createdAt instanceof Date
        ? farm.createdAt.toISOString()
        : farm.createdAt,
    updatedAt:
      farm.updatedAt instanceof Date
        ? farm.updatedAt.toISOString()
        : farm.updatedAt,
  };
}

/**
 * Retrieves all farms owned by the authenticated user, sorted newest first.
 *
 * @param {string} userId
 */
export async function listFarms(userId) {
  const records = await prisma.farm.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return records.map(formatFarm);
}

/**
 * Retrieves a single farm by its ID, ensuring ownership by the authenticated user.
 *
 * @param {string} userId
 * @param {string} farmId
 */
export async function getFarmById(userId, farmId) {
  const farm = await prisma.farm.findFirst({
    where: {
      id: farmId,
      userId,
    },
  });

  return formatFarm(farm);
}

/**
 * Creates a new farm for the authenticated user.
 *
 * @param {string} userId
 * @param {Object} input
 */
export async function createFarm(userId, input) {
  // Ensure the user record exists in the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Upsert default demo user boundary if registered in auth token
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@harvestwindow.local`,
        name: "Farm Owner",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo_salt$demo_hash",
      },
    });
  }

  const created = await prisma.farm.create({
    data: {
      userId,
      name: input.name,
      state: input.state,
      district: input.district,
      soilType: input.soilType || null,
      irrigationSource: input.irrigationSource || null,
      village: input.village || null,
      pincode: input.pincode || null,
      latitude: input.latitude !== undefined ? input.latitude : null,
      longitude: input.longitude !== undefined ? input.longitude : null,
      area: input.area,
      areaUnit: input.areaUnit || "hectare",
      notes: input.notes || null,
    },
  });

  return formatFarm(created);
}

/**
 * Updates an existing farm owned by the authenticated user.
 *
 * @param {string} userId
 * @param {string} farmId
 * @param {Object} input
 */
export async function updateFarm(userId, farmId, input) {
  // Verify existence and ownership
  const existing = await prisma.farm.findFirst({
    where: {
      id: farmId,
      userId,
    },
  });

  if (!existing) {
    return null;
  }

  const updateData = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.district !== undefined) updateData.district = input.district;
  if (input.soilType !== undefined) updateData.soilType = input.soilType;
  if (input.irrigationSource !== undefined) updateData.irrigationSource = input.irrigationSource;
  if (input.village !== undefined) updateData.village = input.village;
  if (input.pincode !== undefined) updateData.pincode = input.pincode;
  if (input.latitude !== undefined) updateData.latitude = input.latitude;
  if (input.longitude !== undefined) updateData.longitude = input.longitude;
  if (input.area !== undefined) updateData.area = input.area;
  if (input.areaUnit !== undefined) updateData.areaUnit = input.areaUnit;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const updated = await prisma.farm.update({
    where: { id: farmId },
    data: updateData,
  });

  return formatFarm(updated);
}

/**
 * Deletes a farm owned by the authenticated user.
 *
 * @param {string} userId
 * @param {string} farmId
 */
export async function deleteFarm(userId, farmId) {
  const existing = await prisma.farm.findFirst({
    where: {
      id: farmId,
      userId,
    },
  });

  if (!existing) {
    return null;
  }

  await prisma.farm.delete({
    where: { id: farmId },
  });

  return true;
}
