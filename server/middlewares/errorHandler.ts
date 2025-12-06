import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

interface MongooseError extends Error {
  statusCode?: number;
  status?: string;
  errors?: any;
  code?: number;
  keyPattern?: any;
  path?: string;
}

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
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      // stack: err.stack,
    });
    return;
  }

  // MONGOOSE VALIDATION.
  if (err.name === "ValidationError") {
    res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: Object.values(err.errors).map((e: any) => ({
        field: e.path,
        message: e.message,
      })),
    });
    return;
  }

  // DUPLICATE KEY.
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    res.status(409).json({
      status: "error",
      message: `${field} already exists`,
    });
    return;
  }

  // INVALID OBJECTID.
  if (err.name === "CastError") {
    res.status(400).json({
      status: "error",
      message: `Invalid ${err.path}`,
    });
    return;
  }

  // JWT ERRORS.
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
    return;
  }

  // OPERATIONAL ERRORS.
  if ((err as any).isOperational) {
    res.status(err.statusCode!).json({
      status: err.status,
      message: err.message,
    });
    return;
  }

  // UNKNOWN ERRORS.
  console.error("✗ Error:", err);
  res.status(500).json({
    status: "error",
    message: "Something went wrong",
  });
};
