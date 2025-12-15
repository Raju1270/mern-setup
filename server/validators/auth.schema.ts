import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50).trim(),
  email: z.email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const loginSchema = z.object({
  email: z.email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email format").toLowerCase().trim(),
});

export const verifyOTPSchema = z.object({
  email: z.email("Invalid email format").toLowerCase().trim(),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^[0-9]+$/, "OTP must contain only numbers"),
});

export const resetPasswordSchema = z.object({
  email: z.email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const verifyMFASchema = z.object({
  userId: z.string().optional(),
  email: z.email("Invalid email format").toLowerCase().trim().optional(),
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
