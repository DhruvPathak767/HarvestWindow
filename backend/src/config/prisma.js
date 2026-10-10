import { PrismaClient } from "@prisma/client";
import { config } from "./env.js";

const isTest = config.NODE_ENV === "test";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: isTest && config.TEST_DATABASE_URL ? config.TEST_DATABASE_URL : config.DATABASE_URL,
      },
    },
    log: isTest ? [] : config.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (config.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    if (!isTest) {
      console.log("[HarvestWindow Database] Connected to database successfully!");
      console.log("MySQL connection established via Prisma.");
    }
  } catch (error) {
    console.error("[HarvestWindow Database] Failed to connect to MySQL database:", error.message);
    throw error;
  }
}

export default prisma;
