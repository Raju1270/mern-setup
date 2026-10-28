// SINGLE SOURCE OF TRUTH FOR DEFAULT PORT/URL FALLBACKS. OVERRIDE VIA ENV.
export const DEFAULT_PORT = "5000";
// INTERNAL-ONLY — REACHED BY gateway/, NEVER PUBLISHED TO THE HOST IN DOCKER.
export const DEFAULT_GRPC_PORT = "50051";
export const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";
export const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017";
export const DEFAULT_DB_NAME = "mern_app";
export const DEFAULT_PROFILE_CACHE_TTL = "300"; // SECONDS.

// LOCAL DEV CONNECTS TO KAFKA'S HOST-PUBLISHED LISTENER; DOCKER COMPOSE OVERRIDES TO kafka:9092.
export const DEFAULT_KAFKA_BROKERS = "127.0.0.1:9094";
export const KAFKA_CLIENT_ID = "auth-service";

// MUST MATCH notification-service/config/constants.ts — NO SHARED PACKAGE BETWEEN THE TWO YET.
export const TOPIC_OTP_EMAIL = "auth.otp-email.requested";

// MUST MATCH realtime-service/config/constants.ts — SAME CAVEAT AS ABOVE.
export const TOPIC_AUTH_EVENTS = "auth.domain-events";
