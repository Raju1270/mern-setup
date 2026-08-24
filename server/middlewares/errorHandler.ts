import type { NextFunction, Request, Response } from "express";
import { AppError, type FieldError } from "../utils/AppError.js";

interface MongooseError extends Error {
  statusCode?: number;
  errors?: any;
  code?: number;
  keyPattern?: any;
  path?: string;
}

// SAME "fail" (4xx, CLIENT'S FAULT) / "error" (5xx, SERVER'S FAULT) CONVENTION AS AppError,
// APPLIED CONSISTENTLY SO EVERY ERROR RESPONSE — HAND-THROWN OR CAUGHT HERE — SHARES ONE SHAPE.
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

// GLOBAL ERROR HANDLER.
export const errorHandler = (
  err: MongooseError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // MONGOOSE VALIDATION.
  if (err.name === "ValidationError") {
    respond(
      res,
      400,
      "Validation failed",
      Object.values(err.errors).map((e: any) => ({ field: e.path, message: e.message }))
    );
    return;
  }

  // DUPLICATE KEY.
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    respond(res, 409, `${field} already exists`);
    return;
  }

  // INVALID OBJECTID.
  if (err.name === "CastError") {
    respond(res, 400, `Invalid ${err.path}`);
    return;
  }

  // JWT ERRORS.
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    respond(res, 401, "Invalid or expired token");
    return;
  }

  // OPERATIONAL ERRORS (INCLUDES VALIDATION ERRORS FROM THE `validate` MIDDLEWARE).
  if ((err as AppError).isOperational) {
    respond(res, err.statusCode || 400, err.message, (err as AppError).errors);
    return;
  }

  // UNKNOWN ERRORS.
  console.error("✗ Error:", err);
  respond(res, 500, process.env.NODE_ENV === "development" ? err.message : "Something went wrong");
};
