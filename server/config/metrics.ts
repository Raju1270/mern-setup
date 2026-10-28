import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const grpcRequestDuration = new client.Histogram({
  name: "grpc_server_request_duration_seconds",
  help: "Duration of gRPC server requests in seconds",
  labelNames: ["method", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [registry],
});

export const kafkaMessagesPublished = new client.Counter({
  name: "kafka_messages_published_total",
  help: "Total number of Kafka messages published",
  labelNames: ["topic", "status"],
  registers: [registry],
});

// req.route.path IS ONLY POPULATED ONCE EXPRESS HAS MATCHED A ROUTE — FALLS BACK TO A FIXED
// LABEL (NOT req.path) FOR 404s SO ARBITRARY/ATTACKER-CONTROLLED URLS CAN'T BLOW UP THE METRIC'S
// CARDINALITY.
export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";
    end({ method: req.method, route, status_code: String(res.statusCode) });
  });
  next();
};
