import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().min(1).default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_ISSUER: z.string().default("harvestwindow-auth"),
  JWT_AUDIENCE: z.string().default("harvestwindow-app"),
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  ADMIN_NAME: z.string().default("HarvestWindow Administrator"),
  ADMIN_EMAIL: z.string().email().default("admin@harvestwindow.local"),
  ADMIN_PASSWORD: z.string().min(8).default("HarvestAdmin#2026!Secure"),
  HARVEST_AI_SERVICE_URL: z.string().default("http://127.0.0.1:8000"),
  WEATHERAPI_KEY: z.string().optional(),
  WEATHERAPI_BASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error("FATAL: Environment configuration validation failed:\n" + issues);
  process.exit(1);
}

export const config = parsed.data;
