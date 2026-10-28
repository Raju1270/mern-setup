import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import { pinoHttp } from "pino-http";
import { validateEnv } from "./config/validateEnv.js";
import { logger } from "./config/logger.js";
import { closeRedis, connectRedis } from "./config/redis.js";
import { DEFAULT_DOCS_PROXY_TARGET, DEFAULT_PORT } from "./config/constants.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { apiRateLimiter, authRateLimiter, docsRateLimiter } from "./middlewares/rateLimiter.js";
import { sanitizeInput } from "./middlewares/sanitize.js";
import authRoutes from "./routes/auth.routes.js";
import { httpMetricsMiddleware, registry } from "./config/metrics.js";

validateEnv();

const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;
const isDev = process.env.NODE_ENV === "development";
const DOCS_PROXY_TARGET = process.env.DOCS_PROXY_TARGET || DEFAULT_DOCS_PROXY_TARGET;

// ALLOWED ORIGINS FOR CORS. DEV MODE REFLECTS ANY ORIGIN, SO THIS ONLY GATES PRODUCTION.
const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean) as string[];

app.set("trust proxy", 1);

// /docs AND /openapi.json ARE MOUNTED BEFORE helmet SO THE PROXIED RESPONSE'S HEADERS PASS
// THROUGH UNTOUCHED — INCLUDING auth-service's OWN CSP HEADER, WHICH CARRIES THE NONCE ITS
// PROXIED HTML'S INLINE <script> NEEDS. IF GATEWAY'S OWN helmet RAN FIRST, IT WOULD OVERWRITE
// THAT CSP HEADER WITH ONE CARRYING A DIFFERENT (OR NO) NONCE AND /docs WOULD BREAK THE SAME
// WAY IT DID BEFORE THE PHASE 1 CSP FIX. (GATEWAY ITSELF NEVER SERVES ANY HTML/INLINE SCRIPTS
// ON ITS OWN ROUTES, SO ITS OWN helmet CONFIG BELOW NEEDS NO NONCE OF ITS OWN.)
//
// RATE-LIMITS /docs + /openapi.json BEFORE THE PROXY. THIS TOO IS MOUNTED WITH NO PATH PREFIX
// AND CHECKS req.path ITSELF, FOR THE SAME REASON AS THE PROXY BELOW — app.use(["/docs", ...],
// middleware) STRIPS THE MATCHED PREFIX FROM req.url AND (UNLIKE A Router) NEVER RESTORES IT,
// SO THE PROXY MOUNTED AFTER IT WOULD SEE THE ALREADY-STRIPPED URL AND 404 THE SAME WAY IT DID
// BEFORE THE pathFilter FIX. WITHOUT THIS, /docs HAD NO RATE LIMITING AT ALL (apiRateLimiter IS
// MOUNTED AFTER THE PROXY, SPECIFICALLY SO helmet/CORS/etc. DON'T TOUCH THE PROXIED RESPONSE —
// SEE BELOW — BUT THAT SAME ORDERING MEANT THIS PATH NEVER REACHED IT).
app.use((req, res, next) => {
  if (req.path === "/docs" || req.path === "/openapi.json") {
    docsRateLimiter(req, res, next);
  } else {
    next();
  }
});

// MOUNTED WITH NO PATH PREFIX (pathFilter DOES THE MATCHING INSTEAD) — app.use("/docs", mw)
// WOULD STRIP "/docs" FROM req.url BEFORE THE PROXY EVER SAW IT, SO THE UPSTREAM WOULD RECEIVE
// "GET /" INSTEAD OF "GET /docs" AND 404. VERIFIED LIVE: THIS IS EXACTLY WHAT HAPPENED BEFORE
// SWITCHING TO pathFilter.
app.use(
  createProxyMiddleware({
    target: DOCS_PROXY_TARGET,
    changeOrigin: true,
    pathFilter: ["/docs", "/openapi.json"],
  })
);

// SECURITY MIDDLEWARES (ONLY EVER APPLY TO GATEWAY'S OWN JSON API RESPONSES — SEE ABOVE).
app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : undefined,
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
app.use(sanitizeInput);

// LOGGING.
app.use(pinoHttp({ logger }));

app.use(httpMetricsMiddleware);

// /health AND /metrics ARE EXEMPT FROM apiRateLimiter — SAME RATIONALE AS server/index.ts:
// MONITORING TRAFFIC SHOULDN'T COUNT AGAINST THE SAME PER-IP BUDGET AS REAL APP TRAFFIC.
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

// GLOBAL RATE LIMITER.
app.use(apiRateLimiter);

const apiRouter = express.Router();
apiRouter.use("/auth", authRateLimiter, authRoutes);

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// GRACEFUL SHUTDOWN.
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal}: Shutting down gracefully...`);

  server.close(async () => {
    try {
      await closeRedis();
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

const start = async (): Promise<void> => {
  try {
    await connectRedis();

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
