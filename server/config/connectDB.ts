import mongoose from "mongoose";
import { DEFAULT_DB_NAME, DEFAULT_MONGO_URI } from "./constants.js";
import { logger } from "./logger.js";

const isDev = process.env.NODE_ENV === "development";

const options = {
  dbName: process.env.MONGO_DB_NAME || DEFAULT_DB_NAME,
  // NO directConnection — THE DRIVER AUTO-DISCOVERS TOPOLOGY FROM THE URI, WHICH WORKS FOR BOTH
  // A STANDALONE (LOCAL pnpm dev) AND THE MULTI-HOST replicaSet=rs0 URI (DOCKER). SETTING IT
  // TRUE WOULD THROW ON THE MULTI-HOST URI ("directConnection not supported with multiple seeds").
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);
    // INDEX CHANGES GO THROUGH migrate-mongo OUTSIDE DEV — SEE server/migrations.
    mongoose.set("autoIndex", isDev);

    const conn = await mongoose.connect(process.env.MONGO_URI || DEFAULT_MONGO_URI, options);

    logger.info(`Mongodb : ${conn.connection.name}`);

    mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB error"));
    mongoose.connection.on("disconnected", () => logger.warn("⚠ Reconnecting..."));
    mongoose.connection.on("reconnected", () => logger.info("✓ Reconnected"));
  } catch (err: any) {
    logger.error({ err }, "✗ MongoDB failed");
    process.exit(1);
  }
};
