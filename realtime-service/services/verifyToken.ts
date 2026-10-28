import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  role?: string;
}

// MIRRORS server/middlewares/auth.ts's authenticate() — SAME TOKEN SHAPE, SAME SECRET.
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    if (!decoded?.userId) return null;
    return decoded;
  } catch {
    return null;
  }
};
