import { z } from "zod";
import {
  DEFAULT_DOCS_PROXY_TARGET,
  DEFAULT_GRPC_SERVER_URL,
  DEFAULT_PORT,
  DEFAULT_REDIS_URL,
} from "./constants.js";
import { logger } from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default(DEFAULT_PORT),
  REDIS_URL: z.string().default(DEFAULT_REDIS_URL),
  GRPC_SERVER_URL: z.string().default(DEFAULT_GRPC_SERVER_URL),
  DOCS_PROXY_TARGET: z.string().default(DEFAULT_DOCS_PROXY_TARGET),
  // MUST MATCH server's JWT_SECRET — TOKENS ARE ISSUED BY auth-service, VERIFIED HERE.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"),
  RATE_LIMIT_MAX: z.string().default("100"),
  AUTH_RATE_LIMIT_MAX: z.string().default("10"),
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

  // SAME GUARD AS server/config/validateEnv.ts — gateway ALSO VERIFIES TOKENS WITH THIS SECRET,
  // SO IT NEEDS THE SAME PRODUCTION SAFETY NET AGAINST THE UNCHANGED EXAMPLE VALUE.
  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET === "your_jwt_secret_key_change_this_in_production") {
      logger.error("❌ Change JWT_SECRET in production!");
      process.exit(1);
    }
  }

  logger.info("✓ Environment validated");
};
