// SINGLE SOURCE OF TRUTH FOR DEFAULT FALLBACKS. OVERRIDE VIA ENV.
export const DEFAULT_KAFKA_BROKERS = "127.0.0.1:9094";
export const KAFKA_CLIENT_ID = "notification-service";
export const KAFKA_CONSUMER_GROUP_ID = "notification-service";
export const DEFAULT_HEALTH_PORT = "5001";

// MUST MATCH server/config/constants.ts — NO SHARED PACKAGE BETWEEN THE TWO YET.
export const TOPIC_OTP_EMAIL = "auth.otp-email.requested";
