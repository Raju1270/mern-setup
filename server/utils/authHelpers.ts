import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth.js";

const getBcryptRounds = () => Number(process.env.BCRYPT_ROUNDS) || 12;

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
