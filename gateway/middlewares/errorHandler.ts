import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { AppError, type FieldError } from "../utils/AppError.js";

interface HandledError extends Error {
  statusCode?: number;
  type?: string;
}

// SAME "fail" (4xx, CLIENT'S FAULT) / "error" (5xx, SERVER'S FAULT) CONVENTION AS server/'s
// errorHandler — SAME ENVELOPE SHAPE, SO THE BROWSER CLIENT SEES NO DIFFERENCE.
const respond = (res: Response, statusCode: number, message: string, errors?: FieldError[]): void => {
  res.status(statusCode).json({
    status: statusCode >= 500 ? "error" : "fail",
    message,
    ...(errors ? { errors } : {}),
  });
};

// 404 HANDLER.
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(new AppError(`${req.method} ${req.originalUrl} not found`, 404));
};

// GLOBAL ERROR HANDLER. NO MONGOOSE-SPECIFIC BRANCHES HERE (UNLIKE server/'s) — THE GATEWAY
// NEVER TOUCHES MONGO DIRECTLY, SO ValidationError/DUPLICATE-KEY/CastError CAN'T ORIGINATE HERE.
export const errorHandler = (
  err: HandledError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // MALFORMED JSON BODY (express.json() THROWS AN http-errors 400, NOT AN AppError).
  if (err.type === "entity.parse.failed") {
    respond(res, 400, "Malformed JSON in request body");
    return;
  }

  // JWT ERRORS (FROM THE GATEWAY'S OWN JWT VERIFICATION — SEE middlewares/auth.ts).
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    respond(res, 401, "Invalid or expired token");
    return;
  }

  // OPERATIONAL ERRORS — VALIDATION FAILURES AND gRPC ERRORS TRANSLATED BACK INTO AppError
  // BY grpc/errorMapping.ts BOTH LAND HERE.
  if ((err as AppError).isOperational) {
    respond(res, err.statusCode || 400, err.message, (err as AppError).errors);
    return;
  }

  // UNKNOWN ERRORS.
  logger.error({ err }, "✗ Unhandled error");
  respond(res, 500, process.env.NODE_ENV === "development" ? err.message : "Something went wrong");
};
