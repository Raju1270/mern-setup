import { bearerAuth, errorResponse } from "../helpers.js";

// MULTI-FACTOR AUTHENTICATION.
export const mfaPaths = {
  "/auth/mfa/verify-login": {
    post: {
      tags: ["MFA"],
      summary: "Complete login with an MFA OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/VerifyMFAInput" } },
        },
      },
      responses: {
        "200": {
          description: "Session issued",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthSession" } },
          },
        },
        "400": errorResponse("Validation error, or invalid/expired OTP"),
      },
    },
  },
  "/auth/mfa/toggle": {
    post: {
      tags: ["MFA"],
      summary: "Request enabling/disabling MFA",
      description: "Sends an OTP to confirm the toggle; requires authentication.",
      security: bearerAuth,
      responses: {
        "200": { description: "OTP sent to confirm the toggle" },
        "401": errorResponse("Not authenticated"),
      },
    },
  },
  "/auth/mfa/verify-toggle": {
    post: {
      tags: ["MFA"],
      summary: "Confirm the MFA enable/disable toggle",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/VerifyMFAInput" } },
        },
      },
      responses: {
        "200": { description: "MFA setting updated" },
        "400": errorResponse("Validation error, or invalid/expired OTP"),
        "401": errorResponse("Not authenticated"),
      },
    },
  },
};
