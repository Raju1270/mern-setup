import { z } from "zod";
import {
  DEFAULT_DB_NAME,
  DEFAULT_MONGO_URI,
  DEFAULT_PORT,
  DEFAULT_PROFILE_CACHE_TTL,
  DEFAULT_REDIS_URL,
} from "./constants.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default(DEFAULT_PORT),
  MONGO_URI: z.string().default(DEFAULT_MONGO_URI),
  MONGO_DB_NAME: z.string().default(DEFAULT_DB_NAME),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.string().default("12"),
  REDIS_URL: z.string().default(DEFAULT_REDIS_URL),
  PROFILE_CACHE_TTL: z.string().default(DEFAULT_PROFILE_CACHE_TTL),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  OTP_EXPIRY_MINUTES: z.string().default("5"),
  OTP_MAX_ATTEMPTS: z.string().default("5"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"),
  RATE_LIMIT_MAX: z.string().default("100"),
  AUTH_RATE_LIMIT_MAX: z.string().default("10"),
  CLIENT_URL: z.string().optional(),
});

export const validateEnv = (): void => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment validation failed:");
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // WARN IN PRODUCTION.
  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET === "your_jwt_secret_key_change_this_in_production") {
      console.error("❌ Change JWT_SECRET in production!");
      process.exit(1);
    }
  }

  console.log("✓ Environment validated");
};
