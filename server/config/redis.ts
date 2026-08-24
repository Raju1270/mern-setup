import { Redis } from "ioredis";
import { DEFAULT_REDIS_URL } from "./constants.js";

let client: Redis | null = null;

export const connectRedis = async (): Promise<void> => {
  try {
    client = new Redis(process.env.REDIS_URL || DEFAULT_REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    await new Promise<void>((resolve, reject) => {
      client!.once("ready", resolve);
      client!.once("error", reject);
    });

    console.log("✓ Redis connected");

    client.on("error", (err) => console.error("✗ Redis error:", err.message));
    client.on("reconnecting", () => console.warn("⚠ Redis reconnecting..."));
  } catch (err: any) {
    console.error("✗ Redis connection failed:", err.message);
    process.exit(1);
  }
};

// THROWS IF CALLED BEFORE connectRedis() DURING STARTUP.
export const getRedisClient = (): Redis => {
  if (!client) throw new Error("Redis client not initialized");
  return client;
};

export const closeRedis = async (): Promise<void> => {
  if (client) {
    await client.quit();
    client = null;
    console.log("Redis connection closed");
  }
};
