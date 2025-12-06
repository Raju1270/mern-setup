import mongoose from "mongoose";

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);

    const conn = await mongoose.connect(process.env.MONGO_URI!, options);

    console.log(`Mongodb : ${conn.connection.name}`);

    mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
    mongoose.connection.on("disconnected", () => console.warn("⚠ Reconnecting..."));
    mongoose.connection.on("reconnected", () => console.log("✓ Reconnected"));
  } catch (err: any) {
    console.error("✗ MongoDB failed:", err.message);
    process.exit(1);
  }
};
