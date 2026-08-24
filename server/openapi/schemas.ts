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
    description:
      "Uniform error envelope from the global error handler. `status` is 'fail' for 4xx " +
      "(client's fault) and 'error' for 5xx. `errors` is present for request validation " +
      "failures — one entry per invalid field.",
    properties: {
      status: { type: "string", enum: ["fail", "error"] },
      message: { type: "string" },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            message: { type: "string" },
          },
          required: ["field", "message"],
        },
      },
    },
    required: ["status", "message"],
  },
};
