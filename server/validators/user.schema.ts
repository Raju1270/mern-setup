import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  email: z.string().email("Invalid email").toLowerCase().trim(),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password needs uppercase, lowercase, and number"),
  age: z.number().int().min(13).max(120).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(50).trim().optional(),
    email: z.string().email("Invalid email").toLowerCase().trim().optional(),
    age: z.number().int().min(13).max(120).optional(),
  })
  .strict();

export const userIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID"),
});

export const userSchema = createUserSchema;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
