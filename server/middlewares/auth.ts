import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface JwtPayload {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// VERIFY JWT TOKEN.
export const authenticate = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError("No token provided", 401));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(new AppError("No token provided", 401));
    }

    // VERIFY TOKEN.
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (!decoded?.userId) {
      return next(new AppError("Invalid token", 401));
    }

    // ATTACH USER TO REQUEST.
    req.user = {
      userId: decoded.userId,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  }
);

// CHECK ROLE AUTHORIZATION.
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!roles.includes(req.user.role || "")) {
      return next(new AppError("Forbidden: Insufficient permissions", 403));
    }

    next();
  };
};
