import { z } from "zod";
import { DEFAULT_HEALTH_PORT, DEFAULT_KAFKA_BROKERS } from "./constants.js";
import { logger } from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HEALTH_PORT: z.string().default(DEFAULT_HEALTH_PORT),
  KAFKA_BROKERS: z.string().default(DEFAULT_KAFKA_BROKERS),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  SMTP_FROM_NAME: z.string().optional(),
  OTP_EXPIRY_MINUTES: z.string().default("5"),
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

  logger.info("✓ Environment validated");
};
