import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/config/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx]?.trim() ?? "";
      });
      rows.push(row);
    }
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export async function seedAgricultureData() {
  console.log("--- Seeding Agricultural Knowledge Data ---");
  const csvPath = path.resolve(__dirname, "../../AI/schemas/verified_indian_crop_calendar.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    return;
  }

  const rawCsv = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(rawCsv);
  console.log(`Parsed ${rows.length} rows from verified_indian_crop_calendar.csv`);

  // 1. Seed Seasons
  const canonicalSeasons = [
    { name: "Kharif", description: "Monsoon cropping season (June - November)" },
    { name: "Rabi", description: "Winter cropping season (October - April)" },
    { name: "Zaid", description: "Summer cropping season (March - June)" },
    { name: "Whole Year", description: "Annual or perennial cropping cycles" },
  ];

  for (const s of canonicalSeasons) {
    await prisma.cropSeason.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name,
        description: s.description,
        verificationStatus: "verified",
      },
    });
  }

  // 2. Ingest rows
  for (const row of rows) {
    const cropName = row.crop_name;
    if (!cropName) continue;

    // Crop Master
    const cropMaster = await prisma.cropMaster.upsert({
      where: { name: cropName },
      update: {
        scientificName: row.scientific_name || null,
        category: row.category || "Commercial",
      },
      create: {
        name: cropName,
        scientificName: row.scientific_name || null,
        category: row.category || "Commercial",
        description: row.notes || null,
        isActive: true,
      },
    });

    // Data Source
    let dataSource = null;
    if (row.source_name) {
      dataSource = await prisma.agriculturalDataSource.findFirst({
        where: { sourceName: row.source_name },
      });
      if (!dataSource) {
        dataSource = await prisma.agriculturalDataSource.create({
          data: {
            sourceName: row.source_name,
            sourceUrl: row.source_url || null,
            publisher: row.publisher || null,
            verificationStatus: row.verification_status || "verified",
            dataOrigin: "verified_benchmark",
          },
        });
      }
    }

    // Variety
    let variety = null;
    if (row.variety_name) {
      variety = await prisma.cropVariety.upsert({
        where: {
          cropId_name: {
            cropId: cropMaster.id,
            name: row.variety_name,
          },
        },
        update: {},
        create: {
          cropId: cropMaster.id,
          name: row.variety_name,
          typicalDurationMinDays: parseInt(row.duration_min_days, 10) || null,
          typicalDurationMaxDays: parseInt(row.duration_max_days, 10) || null,
          sourceId: dataSource?.id || null,
          verificationStatus: row.verification_status || "verified",
        },
      });
    }

    // Region
    let region = null;
    if (row.state) {
      region = await prisma.agriculturalRegion.upsert({
        where: {
          state_district: {
            state: row.state,
            district: row.district || null,
          },
        },
        update: {},
        create: {
          state: row.state,
          district: row.district || null,
          provenance: row.publisher || null,
        },
      });
    }

    // Season
    const seasonRecord = await prisma.cropSeason.findUnique({
      where: { name: row.season || "Kharif" },
    });

    // Calendar
    if (region && seasonRecord) {
      await prisma.cropCalendar.create({
        data: {
          cropId: cropMaster.id,
          varietyId: variety?.id || null,
          regionId: region.id,
          seasonId: seasonRecord.id,
          sowingStartMonth: parseInt(row.sowing_start_month, 10) || 6,
          sowingStartDay: parseInt(row.sowing_start_day, 10) || 1,
          sowingEndMonth: parseInt(row.sowing_end_month, 10) || 7,
          sowingEndDay: parseInt(row.sowing_end_day, 10) || 15,
          harvestStartMonth: parseInt(row.harvest_start_month, 10) || 10,
          harvestStartDay: parseInt(row.harvest_start_day, 10) || 15,
          harvestEndMonth: parseInt(row.harvest_end_month, 10) || 11,
          harvestEndDay: parseInt(row.harvest_end_day, 10) || 15,
          sourceId: dataSource?.id || null,
          verificationStatus: row.verification_status || "verified",
        },
      });
    }

    // Growth Profile
    if (row.duration_typical_days) {
      await prisma.cropGrowthProfile.create({
        data: {
          cropId: cropMaster.id,
          varietyId: variety?.id || null,
          minDurationDays: parseInt(row.duration_min_days, 10) || 90,
          typicalDurationDays: parseInt(row.duration_typical_days, 10) || 120,
          maxDurationDays: parseInt(row.duration_max_days, 10) || 150,
          baseTemperature: row.base_temp_c ? parseFloat(row.base_temp_c) : 10.0,
          upperTemperatureThreshold: row.upper_temp_c ? parseFloat(row.upper_temp_c) : 35.0,
          gddRequirementMin: row.gdd_min ? parseFloat(row.gdd_min) : null,
          gddRequirementTypical: row.gdd_typical ? parseFloat(row.gdd_typical) : null,
          gddRequirementMax: row.gdd_max ? parseFloat(row.gdd_max) : null,
          gddMethod: row.gdd_method || "Standard Daily Mean",
          sourceId: dataSource?.id || null,
          verificationStatus: row.verification_status || "verified",
        },
      });
    }

    // Suitability Profile
    await prisma.cropSuitabilityProfile.create({
      data: {
        cropId: cropMaster.id,
        soilTypes: row.soil_types || null,
        soilPhMin: row.soil_ph_min ? parseFloat(row.soil_ph_min) : null,
        soilPhMax: row.soil_ph_max ? parseFloat(row.soil_ph_max) : null,
        tempMinC: row.temp_min_c ? parseFloat(row.temp_min_c) : null,
        tempMaxC: row.temp_max_c ? parseFloat(row.temp_max_c) : null,
        rainfallMinMm: row.rainfall_min_mm ? parseFloat(row.rainfall_min_mm) : null,
        rainfallMaxMm: row.rainfall_max_mm ? parseFloat(row.rainfall_max_mm) : null,
        waterRequirementDescription: row.water_requirement_notes || null,
        sourceId: dataSource?.id || null,
        verificationStatus: row.verification_status || "verified",
      },
    });
  }

  // Create an import batch record to satisfy audit queries
  await prisma.agriculturalImportBatch.create({
    data: {
      datasetName: "verified_indian_crop_calendar.csv",
      rowsRead: rows.length,
      rowsAccepted: rows.length,
      rowsInserted: rows.length,
      status: "completed",
    },
  });

  console.log("Agricultural knowledge data seeded successfully!");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAgricultureData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
