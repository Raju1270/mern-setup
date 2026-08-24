import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  verifyMFASchema,
  verifyOTPSchema,
} from "../validators/auth.schema.js";
import { toOpenApiSchema } from "./helpers.js";

// COMPONENT SCHEMAS SHARED ACROSS ALL PATH FILES.
export const schemas = {
  SignupInput: toOpenApiSchema(signupSchema),
  LoginInput: toOpenApiSchema(loginSchema),
  ForgotPasswordInput: toOpenApiSchema(forgotPasswordSchema),
  VerifyOTPInput: toOpenApiSchema(verifyOTPSchema),
  ResetPasswordInput: toOpenApiSchema(resetPasswordSchema),
  VerifyMFAInput: toOpenApiSchema(verifyMFASchema),
  UpdateProfileInput: toOpenApiSchema(updateProfileSchema),
  AuthSession: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      accessToken: { type: "string" },
      userId: { type: "string" },
      userName: { type: "string" },
      email: { type: "string", format: "email" },
      role: { type: "string" },
      profilePhoto: { type: "string", nullable: true },
      mfaEnabled: { type: "boolean" },
    },
  },
  ErrorResponse: {
    type: "object",
    properties: {
      status: { type: "string", example: "error" },
      message: { type: "string" },
    },
  },
};
