import mongoose from "mongoose";
import { DEFAULT_DB_NAME, DEFAULT_MONGO_URI } from "./constants.js";

const options = {
  dbName: process.env.MONGO_DB_NAME || DEFAULT_DB_NAME,
  directConnection: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);

    const conn = await mongoose.connect(process.env.MONGO_URI || DEFAULT_MONGO_URI, options);

    console.log(`Mongodb : ${conn.connection.name}`);

    mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
    mongoose.connection.on("disconnected", () => console.warn("⚠ Reconnecting..."));
    mongoose.connection.on("reconnected", () => console.log("✓ Reconnected"));
  } catch (err: any) {
    console.error("✗ MongoDB failed:", err.message);
    process.exit(1);
  }
};
