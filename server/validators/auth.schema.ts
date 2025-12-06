import { z } from "zod";

// SIGNUP VALIDATION.
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50).trim(),
  email: z.email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

// LOGIN VALIDATION.
export const loginSchema = z.object({
  email: z.email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
