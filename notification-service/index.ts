import http from "node:http";
import type { EachMessagePayload } from "kafkajs";
import { z } from "zod";
import { validateEnv } from "./config/validateEnv.js";
import { logger } from "./config/logger.js";
import { closeKafkaConsumer, connectKafkaConsumer } from "./config/kafka.js";
import { closeEmailTransporter } from "./config/emailConfig.js";
import { DEFAULT_HEALTH_PORT, TOPIC_OTP_EMAIL } from "./config/constants.js";
import { sendOtpEmail } from "./services/emailSender.js";
import { kafkaMessagesConsumed, otpEmailsSent, registry } from "./config/metrics.js";

validateEnv();

const otpEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
  subject: z.string(),
});

// A MESSAGE FAILING (BAD SHAPE, OR sendOtpEmail EXHAUSTING ITS OWN RETRIES) IS LOGGED AND
// SKIPPED RATHER THAN RETHROWN — LETTING IT THROW WOULD TRIGGER KAFKAJS'S OWN RETRY/CRASH
// BEHAVIOR AND HEAD-OF-LINE-BLOCK EVERY OTHER PENDING EMAIL BEHIND ONE BAD MESSAGE.
const handleMessage = async ({ message }: EachMessagePayload): Promise<void> => {
  const raw = message.value?.toString();
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error({ err, raw }, "Discarding OTP email message: invalid JSON");
    kafkaMessagesConsumed.inc({ topic: TOPIC_OTP_EMAIL, status: "failure" });
    return;
  }

  const result = otpEmailSchema.safeParse(parsed);
  if (!result.success) {
    logger.error({ issues: result.error.issues, raw }, "Discarding OTP email message: bad shape");
    kafkaMessagesConsumed.inc({ topic: TOPIC_OTP_EMAIL, status: "failure" });
    return;
  }

  try {
    await sendOtpEmail(result.data);
    kafkaMessagesConsumed.inc({ topic: TOPIC_OTP_EMAIL, status: "success" });
    otpEmailsSent.inc();
    logger.info({ email: result.data.email, subject: result.data.subject }, "OTP email sent");
  } catch (err) {
    // A PERMANENT FAILURE HERE IS SILENT TO THE END USER — THE ORIGINAL REST/gRPC CALL ALREADY
    // RETURNED "OTP sent" BEFORE THIS EVER RAN (THAT'S THE POINT OF QUEUEING IT). THERE'S NO
    // DEAD-LETTER QUEUE OR USER-FACING RETRY PATH; THE OPERATIONAL SIGNAL IS THIS log LINE PLUS
    // THE kafka_messages_consumed_total{status="failure"} / otp_emails_sent_total GAP VISIBLE IN
    // GRAFANA (PHASE 5A). A FULL FIX (ALERTING, A WAY FOR THE USER TO REQUEST A RESEND KNOWING
    // THE FIRST ONE FAILED) IS A DELIBERATE SCOPE BOUNDARY FOR NOW.
    kafkaMessagesConsumed.inc({ topic: TOPIC_OTP_EMAIL, status: "failure" });
    logger.error({ err, email: result.data.email }, "Giving up on OTP email after retries");
  }
};

// MINIMAL HEALTH + METRICS ENDPOINTS FOR DOCKER'S HEALTHCHECK AND PROMETHEUS — NO EXPRESS
// DEPENDENCY NEEDED FOR TWO ROUTES.
const startHealthServer = (): http.Server => {
  const port = Number(process.env.HEALTH_PORT || DEFAULT_HEALTH_PORT);
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", uptime: process.uptime() }));
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
  server.listen(port, () => logger.info(`Health endpoint listening on port ${port}`));
  return server;
};

let healthServer: http.Server;

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal}: Shutting down gracefully...`);
  try {
    await closeKafkaConsumer();
    await closeEmailTransporter();
    healthServer?.close();
    logger.info("notification-service closed");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Shutdown error");
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  healthServer = startHealthServer();
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
