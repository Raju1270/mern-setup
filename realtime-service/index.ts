import http from "node:http";
import type { EachMessagePayload } from "kafkajs";
import { type WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { validateEnv } from "./config/validateEnv.js";
import { logger } from "./config/logger.js";
import { closeKafkaConsumer, connectKafkaConsumer } from "./config/kafka.js";
import { DEFAULT_PORT, TOPIC_AUTH_EVENTS, WS_PATH } from "./config/constants.js";
import {
  connectionCount,
  pushToUser,
  registerConnection,
  socketCount,
  unregisterConnection,
} from "./services/connectionRegistry.js";
import { verifyToken } from "./services/verifyToken.js";
import { kafkaMessagesConsumed, registry } from "./config/metrics.js";

validateEnv();

const authEventSchema = z.object({
  type: z.string(),
  userId: z.string(),
  timestamp: z.string(),
});

// HEARTBEAT: DETECTS DEAD CONNECTIONS (E.G. CLIENT'S MACHINE SLEPT / NETWORK DROPPED WITHOUT A
// CLEAN CLOSE FRAME) SO THEY DON'T SIT IN THE REGISTRY FOREVER. STANDARD `ws` PATTERN.
const alive = new WeakMap<WebSocket, boolean>();

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    // "connections" IS THE ACTUAL OPEN-SOCKET COUNT (socketCount) — connectionCount() ALONE
    // WOULD UNDERCOUNT WHENEVER A USER HAS MULTIPLE TABS/DEVICES OPEN, SINCE IT ONLY COUNTS
    // DISTINCT USERS. BOTH ARE REPORTED SINCE THEY ANSWER DIFFERENT QUESTIONS.
    res.end(
      JSON.stringify({ status: "healthy", connections: socketCount(), users: connectionCount() })
    );
    return;
  }
  if (req.url === "/metrics") {
    registry
      .metrics()
      .then((body) => {
        res.writeHead(200, { "Content-Type": registry.contentType });
        res.end(body);
      })
      .catch((err) => {
        logger.error({ err }, "Failed to collect metrics");
        res.writeHead(500).end();
      });
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server, path: WS_PATH });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "", "http://localhost");
  const token = url.searchParams.get("token");
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    socket.close(1008, "Invalid or missing token");
    return;
  }

  const { userId } = payload;
  registerConnection(userId, socket);
  alive.set(socket, true);
  logger.info({ userId }, "Client connected");

  socket.on("pong", () => alive.set(socket, true));

  socket.on("close", () => {
    unregisterConnection(userId, socket);
    logger.info({ userId }, "Client disconnected");
  });

  socket.on("error", (err) => logger.error({ err, userId }, "Socket error"));
});

const heartbeatInterval = setInterval(() => {
  for (const socket of wss.clients) {
    if (alive.get(socket) === false) {
      socket.terminate();
      continue;
    }
    alive.set(socket, false);
    socket.ping();
  }
}, 30000);

// A MESSAGE FAILING (BAD SHAPE) IS LOGGED AND SKIPPED RATHER THAN RETHROWN — SAME RATIONALE AS
// notification-service: LETTING IT THROW WOULD TRIGGER KAFKAJS'S RETRY/CRASH BEHAVIOR AND
// HEAD-OF-LINE-BLOCK EVERY OTHER PENDING EVENT BEHIND ONE BAD MESSAGE.
const handleMessage = async ({ message }: EachMessagePayload): Promise<void> => {
  const raw = message.value?.toString();
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error({ err, raw }, "Discarding auth event: invalid JSON");
    kafkaMessagesConsumed.inc({ topic: TOPIC_AUTH_EVENTS, status: "failure" });
    return;
  }

  const result = authEventSchema.safeParse(parsed);
  if (!result.success) {
    logger.error({ issues: result.error.issues, raw }, "Discarding auth event: bad shape");
    kafkaMessagesConsumed.inc({ topic: TOPIC_AUTH_EVENTS, status: "failure" });
    return;
  }

  pushToUser(result.data.userId, result.data);
  kafkaMessagesConsumed.inc({ topic: TOPIC_AUTH_EVENTS, status: "success" });
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal}: Shutting down gracefully...`);
  try {
    clearInterval(heartbeatInterval);
    await closeKafkaConsumer();
    wss.close();
    server.close();
    logger.info("realtime-service closed");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Shutdown error");
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  server.listen(port, () => logger.info(`Listening on port ${port} (WS path: ${WS_PATH})`));

  await connectKafkaConsumer(handleMessage);

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("uncaughtException", (err) => {
  logger.error({ err }, "✗ Uncaught");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "✗ Unhandled");
  process.exit(1);
});

start();
