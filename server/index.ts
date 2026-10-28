import { randomBytes } from "node:crypto";
import { apiReference } from "@scalar/express-api-reference";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { pinoHttp } from "pino-http";
import { connectDB } from "./config/connectDB.js";
import { validateEnv } from "./config/validateEnv.js";
import { buildOpenApiDocument } from "./openapi/index.js";
import { closeKafkaProducer, connectKafkaProducer } from "./config/kafka.js";
import { logger } from "./config/logger.js";
import { closeRedis, connectRedis } from "./config/redis.js";
import { DEFAULT_GRPC_PORT, DEFAULT_PORT } from "./config/constants.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { sanitizeInput } from "./middlewares/sanitize.js";
import authRoutes from "./routes/auth.routes.js";
import { startGrpcServer } from "./grpc/server.js";
import type { Server as GrpcServer } from "@grpc/grpc-js";
import { httpMetricsMiddleware, registry } from "./config/metrics.js";

validateEnv();

const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;
const GRPC_PORT = process.env.GRPC_PORT || DEFAULT_GRPC_PORT;
const isDev = process.env.NODE_ENV === "development";

// ALLOWED ORIGINS FOR CORS. DEV MODE REFLECTS ANY ORIGIN, SO THIS ONLY GATES PRODUCTION.
const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean) as string[];

// SCALAR RENDERS ITS INIT CALL AS AN INLINE <script>, WHICH A STRICT script-src BLOCKS UNLESS
// IT CARRIES THIS EXACT NONCE. GENERATED ONCE AT BOOT (NOT PER-REQUEST): THE express-api-reference
// PACKAGE BAKES ITS nonce OPTION INTO THE MIDDLEWARE AT CREATION TIME, SO A PER-REQUEST NONCE
// ISN'T SOMETHING IT SUPPORTS — SEE THE apiReference() CALL BELOW.
const docsNonce = randomBytes(16).toString("base64");

app.set("trust proxy", 1);

// SECURITY MIDDLEWARES.
app.use(
  helmet({
    // ALLOW THE SCALAR DOCS UI (SERVED FROM /docs) TO LOAD ITS CDN BUNDLE IN PRODUCTION.
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", `'nonce-${docsNonce}'`, "https://cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            "img-src": ["'self'", "data:", "https:"],
            "font-src": ["'self'", "data:", "https://cdn.jsdelivr.net"],
            "connect-src": ["'self'", "https://cdn.jsdelivr.net"],
            "worker-src": ["'self'", "blob:"],
          },
        },
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
app.use(sanitizeInput);

// LOGGING.
app.use(pinoHttp({ logger }));

app.use(httpMetricsMiddleware);

// /health AND /metrics ARE EXEMPT FROM apiRateLimiter — MONITORING TRAFFIC (DOCKER
// HEALTHCHECKS, PROMETHEUS SCRAPING EVERY FEW SECONDS) SHOULDN'T COUNT AGAINST THE SAME
// PER-IP BUDGET AS REAL APP TRAFFIC, OR A SHORT SCRAPE INTERVAL COULD TRIP THE LIMITER.
app.get("/health", (req, res) =>
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
);

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

// NO RATE LIMITER HERE — gateway IS THE SOLE HTTP RATE-LIMITING ENFORCEMENT POINT NOW
// (gateway/middlewares/rateLimiter.ts). server's REST /api/v1/auth/* IS UNREACHABLE FROM
// OUTSIDE DOCKER (NO ports: MAPPING) AND gateway CALLS THIS OVER gRPC, NOT REST — gRPC
// REQUESTS DON'T GO THROUGH EXPRESS MIDDLEWARE AT ALL, SO A LIMITER HERE WOULD NEVER SEE THAT
// TRAFFIC ANYWAY. KEEPING ONE WAS DEAD WEIGHT AND, WORSE, WOULD SHARE THE SAME REDIS-BACKED
// `ratelimit:<ip>` KEY gateway USES IF server's PORT WERE EVER ACCIDENTALLY EXPOSED, CREATING
// A CONFUSING SECOND BUDGET INSTEAD OF ACTUAL DEFENSE-IN-DEPTH.
const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes);

app.use("/api/v1", apiRouter);

// API DOCS (SCALAR).
const openApiDocument = buildOpenApiDocument(PORT);
app.get("/openapi.json", (req, res) => res.json(openApiDocument));
app.use("/docs", apiReference({ url: "/openapi.json", nonce: docsNonce }));

app.use(notFoundHandler);
app.use(errorHandler);

// GRACEFUL SHUTDOWN.
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal}: Shutting down gracefully...`);

  server.close(async () => {
    try {
      grpcServer.tryShutdown(() => {});
      await closeKafkaProducer();
      await closeRedis();
      await mongoose.connection.close();

      logger.info("Server Closed");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Server Shutdown error");
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// START SERVER.
let server: ReturnType<typeof app.listen>;
let grpcServer: GrpcServer;

const start = async (): Promise<void> => {
  try {
    // FOUR INDEPENDENT CONNECTIONS (NONE DEPENDS ON ANOTHER BEING READY FIRST — MONGOOSE
    // BUFFERS COMMANDS UNTIL CONNECTED, AND BINDING THE gRPC PORT DOESN'T ITSELF TOUCH
    // MONGO/REDIS/KAFKA) — RUNNING THEM IN PARALLEL MEANS STARTUP TAKES AS LONG AS THE
    // SLOWEST ONE INSTEAD OF THE SUM OF ALL FOUR.
    [, , , grpcServer] = await Promise.all([
      connectDB(),
      connectRedis(),
      connectKafkaProducer(),
      startGrpcServer(GRPC_PORT),
    ]);

    server = app.listen(PORT, () => {
      logger.info(`\n ${process.env.NODE_ENV} | Port ${PORT}\n`);
    });

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error: any) {
    logger.error({ err: error }, "Server Start failed");
    process.exit(1);
  }
};

process.on("uncaughtException", (err) => {
  logger.error({ err }, "✗ Uncaught");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "✗ Unhandled");
  server?.close(() => process.exit(1));
});

start();
