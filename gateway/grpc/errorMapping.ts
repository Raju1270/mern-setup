import { status } from "@grpc/grpc-js";
import { AppError } from "../utils/AppError.js";

// INVERSE OF server/grpc/errorMapping.ts's toGrpcError — TRANSLATES A gRPC ServiceError BACK
// INTO THE SAME AppError SHAPE THE REST OF THIS APP (validate.ts, errorHandler.ts) ALREADY
// UNDERSTANDS, SO A CALLER JUST DOES `throw fromGrpcError(err)` AND EVERYTHING ELSE IS IDENTICAL
// TO A DIRECTLY-THROWN AppError.
const GRPC_TO_HTTP_STATUS: Partial<Record<status, number>> = {
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.RESOURCE_EXHAUSTED]: 429,
  // TRANSPORT-LEVEL CODES grpc-js ITSELF EMITS (NOT SENT BY server's toGrpcError) — E.G. WHEN
  // THE server CONTAINER IS DOWN/RESTARTING (UNAVAILABLE) OR A CALL TIMES OUT (DEADLINE_EXCEEDED).
  // WITHOUT THESE, BOTH FELL THROUGH TO A GENERIC 500, MAKING "BACKEND IS DOWN" INDISTINGUISHABLE
  // FROM "SERVER HAS A BUG" TO THE BROWSER.
  [status.UNAVAILABLE]: 503,
  [status.DEADLINE_EXCEEDED]: 504,
};

export const fromGrpcError = (err: { code?: status; details?: string; message?: string }): AppError => {
  const statusCode = (err.code !== undefined && GRPC_TO_HTTP_STATUS[err.code]) || 500;
  const message = err.details || err.message || "Internal error";
  return new AppError(message, statusCode);
};
