import { z } from "zod";
import {
  DEFAULT_DB_NAME,
  DEFAULT_GRPC_PORT,
  DEFAULT_KAFKA_BROKERS,
  DEFAULT_MONGO_URI,
  DEFAULT_PORT,
  DEFAULT_PROFILE_CACHE_TTL,
  DEFAULT_REDIS_URL,
} from "./constants.js";
import { logger } from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default(DEFAULT_PORT),
  GRPC_PORT: z.string().default(DEFAULT_GRPC_PORT),
  MONGO_URI: z.string().default(DEFAULT_MONGO_URI),
  MONGO_DB_NAME: z.string().default(DEFAULT_DB_NAME),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.string().default("12"),
  REDIS_URL: z.string().default(DEFAULT_REDIS_URL),
  PROFILE_CACHE_TTL: z.string().default(DEFAULT_PROFILE_CACHE_TTL),
  KAFKA_BROKERS: z.string().default(DEFAULT_KAFKA_BROKERS),
  OTP_EXPIRY_MINUTES: z.string().default("5"),
  OTP_MAX_ATTEMPTS: z.string().default("5"),
  // NO RATE_LIMIT_* HERE — server NO LONGER RATE-LIMITS ITS OWN HTTP LAYER (SEE index.ts);
  // gateway/config/validateEnv.ts IS WHERE THOSE ACTUALLY APPLY NOW.
  CLIENT_URL: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
});

export const validateEnv = (): void => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error("❌ Environment validation failed:");
    for (const issue of result.error.issues) {
      logger.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // WARN IN PRODUCTION.
  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET === "your_jwt_secret_key_change_this_in_production") {
      logger.error("❌ Change JWT_SECRET in production!");
      process.exit(1);
    }
  }

  logger.info("✓ Environment validated");
};
