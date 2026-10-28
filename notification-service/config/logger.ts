import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const DEFAULT_LEVEL = isDev ? "debug" : "info";
const VALID_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal", "silent"];

// GUARDS AGAINST AN INVALID LOG_LEVEL CRASHING pino() AT IMPORT TIME.
const resolveLevel = (): string => {
  const raw = process.env.LOG_LEVEL;
  if (!raw) return DEFAULT_LEVEL;
  if (VALID_LEVELS.includes(raw)) return raw;

  console.warn(`⚠ Invalid LOG_LEVEL "${raw}", falling back to "${DEFAULT_LEVEL}"`);
  return DEFAULT_LEVEL;
};

// STRUCTURED JSON IN PRODUCTION, PRETTY-PRINTED IN DEVELOPMENT.
export const logger = pino({
  level: resolveLevel(),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      }
    : undefined,
});
