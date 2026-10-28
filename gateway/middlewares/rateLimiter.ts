import type { NextFunction, Request, Response } from "express";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/AppError.js";

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  // NAMESPACES THE REDIS KEY SO DIFFERENT LIMITERS (E.G. THE GENERAL API LIMIT VS. THE STRICTER
  // AUTH LIMIT) DON'T SHARE ONE COUNTER. WITHOUT THIS, apiRateLimiter AND authRateLimiter BOTH
  // WROTE TO THE IDENTICAL `ratelimit:<ip>` KEY, SO UNRELATED API TRAFFIC SILENTLY ATE INTO THE
  // AUTH BUDGET AND A USER COULD GET LOCKED OUT OF LOGIN WELL BEFORE 10 REAL ATTEMPTS.
  name: string;
}

// ATOMIC INCR + SELF-HEALING EXPIRY + REMAINING-TTL READ IN ONE ROUND TRIP INSTEAD OF THREE
// SEQUENTIAL ONES (INCR, PEXPIRE, PTTL) — CUTS THIS MIDDLEWARE'S REDIS LATENCY ON EVERY REQUEST
// BY ~3X. "NX" ON THE PEXPIRE STILL SELF-HEALS A KEY LEFT WITHOUT A TTL (E.G. A CRASH BETWEEN
// THE OLD INCR AND PEXPIRE CALLS), SAME AS BEFORE.
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[1], 'NX')
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

// DISTRIBUTED, REDIS-BACKED FIXED-WINDOW LIMITER. FAILS OPEN IF REDIS IS DOWN. CENTRALIZED HERE
// AT THE GATEWAY NOW (RATHER THAN IN auth-service) SINCE THIS IS THE PUBLIC EDGE.
export const rateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max = Number(process.env.RATE_LIMIT_MAX) || 100,
    message = "Too many requests. Please try again later.",
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || "unknown",
    name,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `ratelimit:${name}:${keyGenerator(req)}`;

    try {
      const redis = getRedisClient();
      const [count, ttl] = (await redis.eval(RATE_LIMIT_SCRIPT, 1, key, windowMs)) as [
        number,
        number,
      ];

      const remaining = Math.max(0, max - count);
      const resetTime = Math.ceil(Math.max(ttl, 0) / 1000);

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetTime);

      if (count > max) {
        res.setHeader("Retry-After", resetTime);
        next(new AppError(message, 429));
        return;
      }

      next();
    } catch (err: any) {
      // FAIL OPEN: DON'T BLOCK TRAFFIC IF REDIS IS UNAVAILABLE.
      logger.error({ err }, "✗ Rate limiter error");
      next();
    }
  };
};

// STRICTER RATE LIMIT FOR AUTH ENDPOINTS.
export const authRateLimiter = rateLimiter({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

// GENERAL API RATE LIMITER.
export const apiRateLimiter = rateLimiter({
  name: "general",
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
});

// FOR /docs AND /openapi.json — SEE gateway/index.ts FOR WHY THESE NEED THEIR OWN LIMITER
// (MOUNTED BEFORE apiRateLimiter, SO THEY WERE PREVIOUSLY UNTHROTTLED ENTIRELY).
export const docsRateLimiter = rateLimiter({
  name: "docs",
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
});
