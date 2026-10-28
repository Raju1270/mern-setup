import { status } from "@grpc/grpc-js";
import { AppError } from "../utils/AppError.js";

// MAPS AppError's HTTP statusCode TO THE CLOSEST gRPC STATUS CODE. AppError ITSELF STAYS
// UNCHANGED — STILL USED EXACTLY AS BEFORE BY THE REST SIDE; THIS IS ONLY A TRANSLATION AT
// THE gRPC BOUNDARY, NOT A NEW ERROR MODEL.
const HTTP_TO_GRPC_STATUS: Record<number, status> = {
  400: status.INVALID_ARGUMENT,
  401: status.UNAUTHENTICATED,
  403: status.PERMISSION_DENIED,
  404: status.NOT_FOUND,
  409: status.ALREADY_EXISTS,
  429: status.RESOURCE_EXHAUSTED,
  503: status.UNAVAILABLE,
};

export const toGrpcError = (err: unknown): { code: status; message: string } => {
  if (err instanceof AppError) {
    return {
      code: HTTP_TO_GRPC_STATUS[err.statusCode] ?? status.INTERNAL,
      message: err.message,
    };
  }

  const message = err instanceof Error ? err.message : "Internal error";
  return { code: status.INTERNAL, message };
};
