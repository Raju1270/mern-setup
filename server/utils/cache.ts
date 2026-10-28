import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";

// BEST-EFFORT CACHE: ANY REDIS ERROR IS LOGGED AND SWALLOWED, NEVER FAILS THE CALLER.
export const getCache = async <T>(key: string): Promise<T | null> => {
  let raw: string | null;

  try {
    raw = await getRedisClient().get(key);
  } catch (err: any) {
    logger.error({ err, key }, "✗ Cache read failed");
    return null;
  }

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (err: any) {
    // CORRUPTED ENTRY — EVICT IT SO IT DOESN'T KEEP FAILING UNTIL TTL EXPIRY.
    logger.error({ err, key }, "✗ Cache entry corrupted, evicting");
    await deleteCache(key);
    return null;
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  let serialized: string;

  try {
    serialized = JSON.stringify(value);
  } catch (err: any) {
    // NON-SERIALIZABLE VALUE — A CALLER BUG, NOT A REDIS FAILURE.
    logger.error({ err, key }, "✗ Cache serialization failed");
    return;
  }

  try {
    await getRedisClient().set(key, serialized, "EX", ttlSeconds);
  } catch (err: any) {
    logger.error({ err, key }, "✗ Cache write failed");
  }
};

export const deleteCache = async (...keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  try {
    await getRedisClient().del(...keys);
  } catch (err: any) {
    logger.error({ err, keys }, "✗ Cache delete failed");
  }
};

// RETURNS THE CACHED VALUE IF PRESENT, OTHERWISE RUNS fetcher, CACHES, AND RETURNS THE RESULT.
// fetcher ERRORS PROPAGATE NORMALLY AND ARE NEVER CACHED. ttlSeconds <= 0 DISABLES CACHING
// ENTIRELY (ALWAYS CALLS fetcher) RATHER THAN PASSING A NON-POSITIVE EXPIRY TO REDIS, WHICH
// setCache's "EX" OPTION WOULD REJECT WITH "ERR invalid expire time".
export const withCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  if (ttlSeconds <= 0) return fetcher();

  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await setCache(key, fresh, ttlSeconds);
  return fresh;
};
