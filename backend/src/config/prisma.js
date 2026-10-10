import { PrismaClient } from "@prisma/client";
import { config } from "./env.js";

const isTest = config.NODE_ENV === "test";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: isTest && config.TEST_DATABASE_URL ? config.TEST_DATABASE_URL : config.DATABASE_URL,
    },
  },
  log: isTest ? [] : config.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    if (!isTest) {
      console.log("MySQL connection established via Prisma.");
    }
  } catch (error) {
    console.error("Failed to connect to MySQL database:", error.message);
    throw error;
  }
}
