import "dotenv/config";
import { z } from "zod";

const boolFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
    }
    return value;
  }, z.boolean().default(defaultValue));

const schema = z.object({
  NODE_ENV: z.string(),
  API_HOST: z.string(),
  API_PORT: z.coerce.number().int().positive(),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().int().positive(),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string(),

  COOKIE_NAME: z.string(),
  COOKIE_SECRET: z.string().min(16),
  COOKIE_SECURE: boolFromEnv(false),

  CORS_ORIGIN: z.string(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: boolFromEnv(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  EMAIL_FROM: z.string(),
  ADMIN_EMAIL: z.string().min(3),

  STORAGE_DRIVER: z.enum(["s3", "local"]).default("s3"),
  STORAGE_LOCAL_DIR: z.string().default("uploads"),
  API_PUBLIC_URL: z.string().default("http://localhost:3001/api"),

  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_PUBLIC_BASE_URL: z.string().optional(),

  SQUARE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_API_VERSION: z.string().default("2026-01-22"),

  // When true, order payments are mocked as successful instead of calling Square.
  // For local/testing only — never enable in production.
  PAYMENTS_TEST_MODE: boolFromEnv(false),
});

const parsed = schema.parse(process.env);

// env loaded via dotenv at process start
export const env = parsed;
