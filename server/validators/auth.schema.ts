import { z } from "zod";

// SINGLE SOURCE OF TRUTH FOR PASSWORD STRENGTH — USED WHEREVER A NEW PASSWORD IS SET.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(100)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50).trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
});

export const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^[0-9]+$/, "OTP must contain only numbers"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: passwordSchema,
});

export const verifyMFASchema = z.object({
  userId: z.string().optional(),
  email: z.string().email("Invalid email format").toLowerCase().trim().optional(),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^[0-9]+$/, "OTP must contain only numbers"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50).trim().optional(),
  profilePhoto: z.string().url("Profile photo must be a valid URL").optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyMFAInput = z.infer<typeof verifyMFASchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
