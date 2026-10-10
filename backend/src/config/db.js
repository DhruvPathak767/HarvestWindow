import prisma from "./prisma.js";

/**
 * Connects to the database and prints a connection status message in the terminal.
 */
export async function connectDB() {
  try {
    await prisma.$connect();
    console.log("[HarvestWindow Database] Connected to database successfully!");
    return true;
  } catch (error) {
    if (error.message?.includes("Unknown database")) {
      console.warn("[HarvestWindow Database] MySQL server reached, but database 'harvestwindow' does not exist yet.");
      console.warn("[HarvestWindow Database] Run `npm run prisma:migrate` in the backend folder to create it.");
    } else {
      console.error("[HarvestWindow Database] Database connection failed:", error.message);
      console.warn("[HarvestWindow Database] Tip: Check your DATABASE_URL in backend/.env");
    }
    return false;
  }
}

export { prisma };
export default connectDB;
