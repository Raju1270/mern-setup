import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateOTP = (): string => {
  return (Math.floor(Math.random() * 900000) + 100000).toString();
};
