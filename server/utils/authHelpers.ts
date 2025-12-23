import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "./AppError.js";
import { AuthRequest } from "../middlewares/auth.js";

const getBcryptRounds = () => Number(process.env.BCRYPT_ROUNDS) || 12;

export const validatePasswordStrength = (password: string): void => {
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400);
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppError("Password must contain at least one uppercase letter", 400);
  }
  if (!/[a-z]/.test(password)) {
    throw new AppError("Password must contain at least one lowercase letter", 400);
  }
  if (!/[0-9]/.test(password)) {
    throw new AppError("Password must contain at least one number", 400);
  }
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
    throw new AppError("Password must contain at least one special character", 400);
  }
};

export const generateToken = (userId: string, role?: string): string => {
  const payload: { userId: string; role?: string } = { userId };
  if (role) {
    payload.role = role;
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET as jwt.Secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
  );
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, getBcryptRounds());
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateOTP = (): string => crypto.randomInt(100000, 1000000).toString();

export const getClientIp = (req: AuthRequest): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};
