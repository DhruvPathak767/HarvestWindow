import { app } from "./app.js";
import { config } from "./config/env.js";
import { connectDatabase, prisma } from "./config/prisma.js";
import { AlertScheduler } from "./modules/notifications/alertScheduler.js";

async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(config.PORT, () => {
      console.log(`=================================================`);
      console.log(` HarvestWindow Auth & Farm API Server Running`);
      console.log(` Environment : ${config.NODE_ENV}`);
      console.log(` Listening on: http://localhost:${config.PORT}`);
      console.log(` Auth API    : http://localhost:${config.PORT}/api/v1/auth`);
      console.log(` Farm API    : http://localhost:${config.PORT}/api/v1/farms`);
      console.log(` Allowed Origin: ${config.FRONTEND_URL}`);
      console.log(` Database    : MySQL (Prisma ORM)`);
      console.log(`=================================================`);

      // Initialize background alert scheduler
      AlertScheduler.start();
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      AlertScheduler.stop();
      server.close(async () => {
        console.log("HTTP server closed.");
        await prisma.$disconnect();
        console.log("Database connection closed. Goodbye!");
        process.exit(0);
      });

      // Force exit if shutdown hangs
      setTimeout(() => {
        console.error("Forceful shutdown triggered after timeout.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
