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

// DURATION OF gateway's OUTBOUND gRPC CALLS TO server — DISTINCT FROM server's OWN
// grpc_server_request_duration_seconds (WHICH TIMES ONLY server-SIDE PROCESSING); THIS ONE
// ALSO INCLUDES NETWORK ROUND-TRIP, SO THE GAP BETWEEN THE TWO IS THE gRPC HOP ITSELF.
export const grpcClientDuration = new client.Histogram({
  name: "grpc_client_request_duration_seconds",
  help: "Duration of outbound gRPC calls from gateway to server, in seconds",
  labelNames: ["method", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [registry],
});

// SAME CARDINALITY GUARD AS server/config/metrics.ts — SEE THERE FOR RATIONALE.
export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";
    end({ method: req.method, route, status_code: String(res.statusCode) });
  });
  next();
};
