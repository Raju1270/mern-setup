import { bearerAuth, errorResponse } from "../helpers.js";

// AUTHENTICATED USER PROFILE.
export const profilePaths = {
  "/auth/profile": {
    get: {
      tags: ["Profile"],
      summary: "Get the authenticated user's profile",
      security: bearerAuth,
      responses: {
        "200": { description: "Profile returned" },
        "401": errorResponse("Not authenticated"),
      },
    },
    patch: {
      tags: ["Profile"],
      summary: "Update the authenticated user's profile",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileInput" } },
        },
      },
      responses: {
        "200": { description: "Profile updated" },
        "400": errorResponse("Validation error"),
        "401": errorResponse("Not authenticated"),
      },
    },
  },
  "/auth/deactivate": {
    post: {
      tags: ["Profile"],
      summary: "Deactivate the authenticated user's account",
      security: bearerAuth,
      responses: {
        "200": { description: "Account deactivated" },
        "401": errorResponse("Not authenticated"),
      },
    },
  },
};
