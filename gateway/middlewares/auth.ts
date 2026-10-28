import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface JwtPayload {
  userId: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// VERIFIES THE JWT server ISSUED — SAME SECRET, SAME PAYLOAD SHAPE. THE VERIFIED userId IS ALL
// THAT GETS FORWARDED TO server OVER gRPC (SEE grpc/client.ts CALLERS) — server TRUSTS IT
// SINCE gRPC IS ONLY REACHABLE WITHIN THE DOCKER NETWORK, NEVER FROM THE BROWSER.
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (!decoded?.userId) {
      return next(new AppError("Invalid token", 401));
    }

    req.user = { userId: decoded.userId, role: decoded.role };

    next();
  }
);
