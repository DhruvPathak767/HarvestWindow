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
