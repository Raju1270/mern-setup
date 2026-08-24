import type { NextFunction, Request, Response } from "express";
import { getRedisClient } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

// DISTRIBUTED, REDIS-BACKED FIXED-WINDOW LIMITER. FAILS OPEN IF REDIS IS DOWN.
export const rateLimiter = (options: RateLimitOptions = {}) => {
  const {
    windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max = Number(process.env.RATE_LIMIT_MAX) || 100,
    message = "Too many requests. Please try again later.",
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || "unknown",
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `ratelimit:${keyGenerator(req)}`;

    try {
      const redis = getRedisClient();
      const count = await redis.incr(key);

      // "NX" SELF-HEALS A KEY LEFT WITHOUT A TTL (E.G. A CRASH BETWEEN incr AND pexpire).
      await redis.pexpire(key, windowMs, "NX");

      const ttl = await redis.pttl(key);
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
      console.error("✗ Rate limiter error:", err.message);
      next();
    }
  };
};

// STRICTER RATE LIMIT FOR AUTH ENDPOINTS.
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

// GENERAL API RATE LIMITER.
export const apiRateLimiter = rateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
});
