import { errorResponse } from "../helpers.js";

// SIGNUP, LOGIN, PASSWORD RESET.
export const authPaths = {
  "/auth/signup": {
    post: {
      tags: ["Auth"],
      summary: "Register a new account",
      description: "Creates an inactive account and emails a 6-digit OTP to verify it.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/SignupInput" } },
        },
      },
      responses: {
        "201": {
          description: "OTP sent, awaiting verification",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  userId: { type: "string" },
                  email: { type: "string", format: "email" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        "400": errorResponse("Validation error"),
        "409": errorResponse("Email already registered"),
      },
    },
  },
  "/auth/verify-signup": {
    post: {
      tags: ["Auth"],
      summary: "Verify signup OTP and activate the account",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/VerifyOTPInput" } },
        },
      },
      responses: {
        "200": {
          description: "Account activated, session issued",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthSession" } },
          },
        },
        "400": errorResponse("Validation error, or invalid/expired OTP"),
      },
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Log in with email and password",
      description: "Returns a session directly, or `mfaRequired: true` if MFA is enabled.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } },
        },
      },
      responses: {
        "200": {
          description: "Session issued, or MFA challenge issued",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthSession" } },
          },
        },
        "400": errorResponse("Validation error"),
        "401": errorResponse("Invalid credentials"),
        "403": errorResponse("Email unverified or account deactivated"),
      },
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request a password reset OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ForgotPasswordInput" },
          },
        },
      },
      responses: {
        "200": { description: "OTP sent to email" },
        "400": errorResponse("Validation error"),
        "404": errorResponse("No account with that email"),
      },
    },
  },
  "/auth/verify-otp": {
    post: {
      tags: ["Auth"],
      summary: "Verify a password-reset OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/VerifyOTPInput" } },
        },
      },
      responses: {
        "200": { description: "OTP verified" },
        "400": errorResponse("Validation error, or invalid/expired OTP"),
      },
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset the password after OTP verification",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordInput" } },
        },
      },
      responses: {
        "200": { description: "Password reset successfully" },
        "400": errorResponse("Validation error, or OTP not verified/expired"),
      },
    },
  },
};
