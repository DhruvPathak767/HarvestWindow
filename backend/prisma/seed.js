import argon2 from "argon2";
import { config } from "../src/config/env.js";
import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("--- Initializing HarvestWindow Database Seed ---");

  // 1. Initialize Administrator Account
  const adminEmail = config.ADMIN_EMAIL.trim().toLowerCase();
  const adminName = config.ADMIN_NAME.trim();
  const adminPassword = config.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const adminPasswordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    if (existingAdmin) {
      const updated = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: adminName,
          role: "ADMIN",
          passwordHash: adminPasswordHash,
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });
      console.log(`Administrator account verified/updated: ${updated.email} (${updated.role})`);
    } else {
      const created = await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash: adminPasswordHash,
          role: "ADMIN",
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });
      console.log(`Administrator account created: ${created.email} (${created.role})`);
    }
  }

  // 2. Initialize Pre-populated Demo Farmer Account (ananya@harvestwindow.demo)
  const demoEmail = "ananya@harvestwindow.demo";
  const demoName = "Ananya Deshpande";
  const demoPassword = "harvest-demo";

  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  const demoPasswordHash = await argon2.hash(demoPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  if (existingDemo) {
    await prisma.user.update({
      where: { id: existingDemo.id },
      data: {
        name: demoName,
        role: "FARMER",
        passwordHash: demoPasswordHash,
        isActive: true,
      },
    });
    console.log(`Demo farmer account verified/updated: ${demoEmail} (FARMER)`);
  } else {
    await prisma.user.create({
      data: {
        name: demoName,
        email: demoEmail,
        passwordHash: demoPasswordHash,
        role: "FARMER",
        isActive: true,
      },
    });
    console.log(`Demo farmer account created in MySQL: ${demoEmail} (FARMER)`);
  }

  const ananyaUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (ananyaUser) {
    // Seed Demo Farms
    const demoFarms = [
      {
        id: "farm-greenridge",
        name: "Greenridge Farm",
        state: "Karnataka",
        district: "Hassan",
        latitude: 13.0068,
        longitude: 76.1001,
        area: 12.5,
        areaUnit: "HECTARE",
        soilType: "Red Sandy Loam",
        irrigationSource: "Borewell",
        notes: "Irrigated bore-well blocks with two rainfed fields on the eastern boundary.",
      },
      {
        id: "farm-meher",
        name: "Meher Fields",
        state: "Punjab",
        district: "Ludhiana",
        latitude: 30.9009,
        longitude: 75.8573,
        area: 16.0,
        areaUnit: "ACRE",
        soilType: "Alluvial Loam",
        irrigationSource: "Canal + Tubewell",
        notes: "Family holding, canal irrigation plus tube-well backup.",
      },
      {
        id: "farm-kaveri",
        name: "Kaveri Belt Collective",
        state: "Tamil Nadu",
        district: "Thanjavur",
        latitude: 10.787,
        longitude: 79.1381,
        area: 21.0,
        areaUnit: "HECTARE",
        soilType: "Deltaic Alluvium",
        irrigationSource: "River Canal",
        notes: "Seven member farms coordinated through the delta collective.",
      },
    ];

    for (const f of demoFarms) {
      await prisma.farm.upsert({
        where: { id: f.id },
        update: {
          name: f.name,
          state: f.state,
          district: f.district,
          latitude: f.latitude,
          longitude: f.longitude,
          area: f.area,
          areaUnit: f.areaUnit,
          soilType: f.soilType,
          irrigationSource: f.irrigationSource,
          userId: ananyaUser.id,
        },
        create: {
          id: f.id,
          userId: ananyaUser.id,
          name: f.name,
          state: f.state,
          district: f.district,
          latitude: f.latitude,
          longitude: f.longitude,
          area: f.area,
          areaUnit: f.areaUnit,
          soilType: f.soilType,
          irrigationSource: f.irrigationSource,
          notes: f.notes,
        },
      });
    }

    // Seed Initial Demo Crops
    const demoCrops = [
      {
        id: "crop-paddy-jyothi",
        farmId: "farm-greenridge",
        cropName: "Rice (Paddy)",
        variety: "Jyothi",
        sowingDate: new Date(Date.now() - 132 * 86400000),
        growthStage: "Grain filling",
        fieldArea: 4.2,
        expectedYield: "6.2 t/ha",
        irrigationMethod: "irrigated",
        notes: "Transplanted after pre-monsoon showers; drained 12 days ago.",
      },
      {
        id: "crop-tomato-arka",
        farmId: "farm-greenridge",
        cropName: "Tomato",
        variety: "Arka Rakshak",
        sowingDate: new Date(Date.now() - 70 * 86400000),
        growthStage: "Fruit development",
        fieldArea: 1.1,
        expectedYield: "38 t/ha",
        irrigationMethod: "irrigated",
        notes: "Staked, drip irrigated. First flush colouring unevenly.",
      },
      {
        id: "crop-groundnut-tmv",
        farmId: "farm-greenridge",
        cropName: "Groundnut",
        variety: "TMV 2",
        sowingDate: new Date(Date.now() - 95 * 86400000),
        growthStage: "Pod development",
        fieldArea: 2.8,
        expectedYield: "2.4 t/ha",
        irrigationMethod: "rainfed",
        notes: "Rainfed block on red sandy loam; gypsum applied at flowering.",
      },
    ];

    for (const c of demoCrops) {
      await prisma.crop.upsert({
        where: { id: c.id },
        update: {
          farmId: c.farmId,
          cropName: c.cropName,
          variety: c.variety,
          sowingDate: c.sowingDate,
          growthStage: c.growthStage,
          fieldArea: c.fieldArea,
          expectedYield: c.expectedYield,
          irrigationMethod: c.irrigationMethod,
          notes: c.notes,
        },
        create: {
          id: c.id,
          farmId: c.farmId,
          cropName: c.cropName,
          variety: c.variety,
          sowingDate: c.sowingDate,
          growthStage: c.growthStage,
          fieldArea: c.fieldArea,
          expectedYield: c.expectedYield,
          irrigationMethod: c.irrigationMethod,
          notes: c.notes,
        },
      });
    }

    console.log("Demo farms and crops seeded successfully for Ananya!");
  }

  console.log("Database seed process completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed process encountered an error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
