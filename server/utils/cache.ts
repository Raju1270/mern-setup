import { getRedisClient } from "../config/redis.js";

// BEST-EFFORT CACHE: ANY REDIS ERROR IS LOGGED AND SWALLOWED, NEVER FAILS THE CALLER.
export const getCache = async <T>(key: string): Promise<T | null> => {
  let raw: string | null;

  try {
    raw = await getRedisClient().get(key);
  } catch (err: any) {
    console.error(`✗ Cache read failed [${key}]:`, err.message);
    return null;
  }

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (err: any) {
    // CORRUPTED ENTRY — EVICT IT SO IT DOESN'T KEEP FAILING UNTIL TTL EXPIRY.
    console.error(`✗ Cache entry corrupted [${key}], evicting:`, err.message);
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
    console.error(`✗ Cache serialization failed [${key}]:`, err.message);
    return;
  }

  try {
    await getRedisClient().set(key, serialized, "EX", ttlSeconds);
  } catch (err: any) {
    console.error(`✗ Cache write failed [${key}]:`, err.message);
  }
};

export const deleteCache = async (...keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  try {
    await getRedisClient().del(...keys);
  } catch (err: any) {
    console.error(`✗ Cache delete failed [${keys.join(", ")}]:`, err.message);
  }
};

// RETURNS THE CACHED VALUE IF PRESENT, OTHERWISE RUNS fetcher, CACHES, AND RETURNS THE RESULT.
// fetcher ERRORS PROPAGATE NORMALLY AND ARE NEVER CACHED.
export const withCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await setCache(key, fresh, ttlSeconds);
  return fresh;
};
