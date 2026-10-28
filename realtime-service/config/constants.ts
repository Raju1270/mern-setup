// SINGLE SOURCE OF TRUTH FOR DEFAULT FALLBACKS. OVERRIDE VIA ENV.
export const DEFAULT_KAFKA_BROKERS = "127.0.0.1:9094";
export const KAFKA_CLIENT_ID = "realtime-service";
export const KAFKA_CONSUMER_GROUP_ID = "realtime-service";
export const DEFAULT_PORT = "5002";
export const WS_PATH = "/ws";

// MUST MATCH server/config/constants.ts — NO SHARED PACKAGE BETWEEN THE TWO YET.
export const TOPIC_AUTH_EVENTS = "auth.domain-events";
