import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * List canonical crops with pagination and rich agricultural filtering.
 */
export async function listCrops(params = {}) {
  const {
    search,
    category,
    season,
    state,
    district,
    hasGrowthProfile,
    page = 1,
    limit = 20,
  } = params;

  const where = {
    isActive: true,
  };

  if (category) {
    where.category = { equals: category };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { scientificName: { contains: search } },
    ];
  }

  if (hasGrowthProfile !== undefined) {
    if (hasGrowthProfile) {
      where.growthProfiles = { some: {} };
    } else {
      where.growthProfiles = { none: {} };
    }
  }

  // Filter crops with calendars matching given region or season
  const calendarFilter = {};
  if (season) {
    calendarFilter.season = { name: { equals: season } };
  }
  if (state || district) {
    calendarFilter.region = {};
    if (state) calendarFilter.region.state = { equals: state };
    if (district) calendarFilter.region.district = { equals: district };
  }

  if (Object.keys(calendarFilter).length > 0) {
    where.calendars = { some: calendarFilter };
  }

  const offset = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.cropMaster.count({ where }),
    prisma.cropMaster.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            varieties: true,
            calendars: true,
            growthProfiles: true,
            suitabilities: true,
          },
        },
        growthProfiles: {
          take: 1,
          select: {
            minDurationDays: true,
            typicalDurationDays: true,
            maxDurationDays: true,
            gddRequirementTypical: true,
            baseTemperature: true,
            verificationStatus: true,
          },
        },
      },
    }),
  ]);

  const mapped = items.map((c) => ({
    id: c.id,
    name: c.name,
    scientificName: c.scientificName,
    category: c.category,
    description: c.description,
    counts: {
      varieties: c._count.varieties,
      calendars: c._count.calendars,
      growthProfiles: c._count.growthProfiles,
      suitabilities: c._count.suitabilities,
    },
    primaryGrowthProfile: c.growthProfiles[0] || null,
    hasGDD: Boolean(c.growthProfiles[0]?.gddRequirementTypical),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return {
    items: mapped,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieve comprehensive details for a single canonical crop.
 */
export async function getCropById(cropId) {
  const crop = await prisma.cropMaster.findUnique({
    where: { id: cropId },
    include: {
      varieties: {
        where: { isActive: true },
        include: {
          source: {
            select: { sourceName: true, verificationStatus: true },
          },
        },
        orderBy: { name: "asc" },
      },
      growthProfiles: {
        include: {
          variety: { select: { id: true, name: true } },
          source: {
            select: { sourceName: true, sourceUrl: true, publisher: true, verificationStatus: true },
          },
        },
      },
      suitabilities: {
        include: {
          source: {
            select: { sourceName: true, sourceUrl: true, publisher: true, verificationStatus: true },
          },
        },
      },
      calendars: {
        include: {
          region: true,
          season: true,
          variety: { select: { id: true, name: true } },
          source: {
            select: { sourceName: true, sourceUrl: true, publisher: true, verificationStatus: true },
          },
        },
        orderBy: [{ region: { state: "asc" } }, { sowingStartMonth: "asc" }],
      },
    },
  });

  if (!crop) {
    throw new AppError(`Crop record with ID '${cropId}' not found.`, 404);
  }

  return crop;
}

/**
 * List all canonical agricultural seasons.
 */
export async function listSeasons() {
  const seasons = await prisma.cropSeason.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { calendars: true },
      },
    },
  });

  return seasons.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    monthsCovered: s.monthsCovered,
    geographicCoverage: s.geographicCoverage,
    verificationStatus: s.verificationStatus,
    calendarCount: s._count.calendars,
  }));
}

/**
 * Search and filter agricultural states and districts.
 */
export async function listRegions(params = {}) {
  const { state, search, page = 1, limit = 50 } = params;

  const where = {};
  if (state) {
    where.state = { equals: state };
  }
  if (search) {
    where.OR = [
      { state: { contains: search } },
      { district: { contains: search } },
    ];
  }

  const offset = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.agriculturalRegion.count({ where }),
    prisma.agriculturalRegion.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: [{ state: "asc" }, { district: "asc" }],
      include: {
        _count: {
          select: { calendars: true },
        },
      },
    }),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      country: r.country,
      state: r.state,
      district: r.district,
      zone: r.zone,
      calendarCount: r._count.calendars,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Filter regional crop calendars by crop, state, district, or season.
 */
export async function getCropCalendars(params = {}) {
  const { cropId, crop, varietyId, state, district, season, page = 1, limit = 30 } = params;

  const where = {};

  if (cropId) {
    where.cropId = cropId;
  } else if (crop) {
    where.crop = { name: { contains: crop } };
  }

  if (varietyId) {
    where.varietyId = varietyId;
  }

  if (state || district) {
    where.region = {};
    if (state) where.region.state = { equals: state };
    if (district) where.region.district = { equals: district };
  }

  if (season) {
    where.season = { name: { equals: season } };
  }

  const offset = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.cropCalendar.count({ where }),
    prisma.cropCalendar.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: [{ crop: { name: "asc" } }, { region: { state: "asc" } }],
      include: {
        crop: { select: { id: true, name: true, category: true } },
        variety: { select: { id: true, name: true } },
        region: { select: { id: true, state: true, district: true, country: true } },
        season: { select: { id: true, name: true } },
        source: { select: { id: true, sourceName: true, sourceUrl: true, verificationStatus: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieve verified crop growth and GDD profiles.
 */
export async function getCropGrowthProfiles(params = {}) {
  const { cropId, crop, varietyId } = params;

  const where = {};
  if (cropId) {
    where.cropId = cropId;
  } else if (crop) {
    where.crop = { name: { contains: crop } };
  }
  if (varietyId) {
    where.varietyId = varietyId;
  }

  const items = await prisma.cropGrowthProfile.findMany({
    where,
    include: {
      crop: { select: { id: true, name: true, category: true } },
      variety: { select: { id: true, name: true } },
      source: { select: { id: true, sourceName: true, sourceUrl: true, verificationStatus: true } },
    },
    orderBy: { crop: { name: "asc" } },
  });

  return items;
}

/**
 * Retrieve environmental and soil suitability profiles.
 */
export async function getCropSuitabilityProfiles(params = {}) {
  const { cropId, crop } = params;

  const where = {};
  if (cropId) {
    where.cropId = cropId;
  } else if (crop) {
    where.crop = { name: { contains: crop } };
  }

  const items = await prisma.cropSuitabilityProfile.findMany({
    where,
    include: {
      crop: { select: { id: true, name: true, category: true } },
      source: { select: { id: true, sourceName: true, sourceUrl: true, verificationStatus: true } },
    },
    orderBy: { crop: { name: "asc" } },
  });

  return items;
}

/**
 * Retrieve provenance registry of agricultural datasets and sources.
 */
export async function getDataSources() {
  const sources = await prisma.agriculturalDataSource.findMany({
    orderBy: { sourceName: "asc" },
    include: {
      _count: {
        select: {
          calendars: true,
          growthProfiles: true,
          suitabilityProfiles: true,
          importBatches: true,
        },
      },
    },
  });

  return sources.map((s) => ({
    id: s.id,
    sourceName: s.sourceName,
    sourceUrl: s.sourceUrl,
    datasetTitle: s.datasetTitle,
    publisher: s.publisher,
    license: s.license,
    geographicCoverage: s.geographicCoverage,
    dataOrigin: s.dataOrigin,
    verificationStatus: s.verificationStatus,
    notes: s.notes,
    usage: {
      calendarsCount: s._count.calendars,
      growthProfilesCount: s._count.growthProfiles,
      suitabilityProfilesCount: s._count.suitabilityProfiles,
      batchesCount: s._count.importBatches,
    },
    createdAt: s.createdAt,
  }));
}

/**
 * Safe summary statistics about data completeness, verification status, and crop calendar coverage.
 */
export async function getDataQualitySummary() {
  const [
    totalCrops,
    totalVarieties,
    totalCalendars,
    totalGrowthProfiles,
    totalSuitabilities,
    totalRegions,
    gddCount,
    verificationGroups,
    latestBatch,
  ] = await Promise.all([
    prisma.cropMaster.count(),
    prisma.cropVariety.count(),
    prisma.cropCalendar.count(),
    prisma.cropGrowthProfile.count(),
    prisma.cropSuitabilityProfile.count(),
    prisma.agriculturalRegion.count(),
    prisma.cropGrowthProfile.count({
      where: { gddRequirementTypical: { not: null } },
    }),
    prisma.cropCalendar.groupBy({
      by: ["verificationStatus"],
      _count: { _all: true },
    }),
    prisma.agriculturalImportBatch.findFirst({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const verificationBreakdown = {};
  for (const group of verificationGroups) {
    verificationBreakdown[group.verificationStatus] = group._count._all;
  }

  return {
    completeness: {
      totalCrops,
      totalVarieties,
      totalCalendars,
      totalGrowthProfiles,
      totalSuitabilities,
      totalRegions,
      gddAvailabilityCount: gddCount,
      gddCoveragePercentage: totalGrowthProfiles > 0 ? Math.round((gddCount / totalGrowthProfiles) * 100) : 0,
    },
    verificationDistribution: verificationBreakdown,
    provenanceStatus: {
      isVerifiedReferenceAvailable: totalCalendars > 0,
      verifiedCalendarCount: verificationBreakdown["verified"] || 0,
      referenceOnlyCalendarCount: verificationBreakdown["reference_only"] || 0,
      unverifiedCalendarCount: verificationBreakdown["unverified"] || 0,
    },
    latestImportBatch: latestBatch
      ? {
          datasetName: latestBatch.datasetName,
          status: latestBatch.status,
          rowsAccepted: latestBatch.rowsAccepted,
          rowsRejected: latestBatch.rowsRejected,
          completedAt: latestBatch.completedAt,
        }
      : null,
  };
}
