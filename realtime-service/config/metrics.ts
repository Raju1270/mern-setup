import client from "prom-client";
import { connectionCount, socketCount } from "../services/connectionRegistry.js";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const kafkaMessagesConsumed = new client.Counter({
  name: "kafka_messages_consumed_total",
  help: "Total number of Kafka messages consumed",
  labelNames: ["topic", "status"],
  registers: [registry],
});

// PULLED LIVE FROM THE CONNECTION REGISTRY ON EACH SCRAPE (VIA collect()) RATHER THAN
// INCREMENTED/DECREMENTED ALONGSIDE registerConnection/unregisterConnection — ONE LESS PLACE
// THAT CAN DRIFT FROM THE REGISTRY'S OWN GROUND TRUTH.
export const websocketConnectedUsers = new client.Gauge({
  name: "websocket_connected_users",
  help: "Number of distinct users with at least one open WebSocket connection",
  registers: [registry],
  collect() {
    this.set(connectionCount());
  },
});

// TOTAL OPEN SOCKETS — DISTINCT FROM websocket_connected_users, WHICH UNDERCOUNTS A USER WITH
// MULTIPLE TABS/DEVICES OPEN. THIS IS THE FIGURE THAT ACTUALLY REFLECTS WEBSOCKET LOAD.
export const websocketOpenConnections = new client.Gauge({
  name: "websocket_open_connections",
  help: "Total number of open WebSocket connections (sockets), across all users",
  registers: [registry],
  collect() {
    this.set(socketCount());
  },
});
