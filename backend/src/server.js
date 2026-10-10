import "dotenv/config";
import app from "./app.js";
import { connectDB, prisma } from "./config/db.js";

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, async () => {
  console.log(`[HarvestWindow API] Server listening on http://localhost:${PORT}`);
  console.log(`[HarvestWindow API] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[HarvestWindow API] Farm Management API mounted at http://localhost:${PORT}/api/farms`);

  // Connect to database and display connection message in terminal
  await connectDB();
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n[HarvestWindow API] Received ${signal}. Closing server gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("[HarvestWindow API] Database connection closed.");
    } catch (e) {
      console.error("[HarvestWindow API] Error disconnecting database:", e);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
