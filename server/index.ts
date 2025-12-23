import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import { connectDB } from "./config/connectDB.js";
import { validateEnv } from "./config/validateEnv.js";
import { closeEmailTransporter } from "./config/emailConfig.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { apiRateLimiter, authRateLimiter } from "./middlewares/rateLimiter.js";
import authRoutes from "./routes/auth.routes.js";

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV === "development";

// ALLOWED ORIGINS FOR CORS.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.set("trust proxy", 1);

// SECURITY MIDDLEWARES.
app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : undefined,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: isDev ? true : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// BODY PARSERS.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(cookieParser());

// LOGGING.
app.use(morgan(isDev ? "dev" : "combined"));

// GLOBAL RATE LIMITER.
app.use(apiRateLimiter);

// ROUTES.
app.get("/health", (req, res) =>
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
);

const apiRouter = express.Router();
apiRouter.use("/auth", authRateLimiter, authRoutes);

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// GRACEFUL SHUTDOWN.
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal}: Shutting down gracefully...`);

  server.close(async () => {
    try {
      await closeEmailTransporter();
      await mongoose.connection.close();

      console.log("Server Closed");
      process.exit(0);
    } catch (err) {
      console.error("Server Shutdown error:", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// START SERVER.
let server: ReturnType<typeof app.listen>;

const start = async (): Promise<void> => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`\n ${process.env.NODE_ENV} | Port ${PORT}\n`);
    });

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error: any) {
    console.error("Server Start failed:", error.message);
    process.exit(1);
  }
};

process.on("uncaughtException", (err) => {
  console.error("✗ Uncaught:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("✗ Unhandled:", err);
  server?.close(() => process.exit(1));
});

start();
