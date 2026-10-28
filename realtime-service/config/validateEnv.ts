import { z } from "zod";
import { DEFAULT_KAFKA_BROKERS, DEFAULT_PORT } from "./constants.js";
import { logger } from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default(DEFAULT_PORT),
  KAFKA_BROKERS: z.string().default(DEFAULT_KAFKA_BROKERS),
  // MUST MATCH server's JWT_SECRET — TOKENS ARE ISSUED BY auth-service, VERIFIED HERE.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
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

  // SAME GUARD AS server/config/validateEnv.ts — realtime-service ALSO VERIFIES TOKENS WITH
  // THIS SECRET, SO IT NEEDS THE SAME PRODUCTION SAFETY NET AGAINST THE UNCHANGED EXAMPLE VALUE.
  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET === "your_jwt_secret_key_change_this_in_production") {
      logger.error("❌ Change JWT_SECRET in production!");
      process.exit(1);
    }
  }

  logger.info("✓ Environment validated");
};
