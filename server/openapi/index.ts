import { DEFAULT_PORT } from "../config/constants.js";
import { authPaths } from "./paths/auth.paths.js";
import { mfaPaths } from "./paths/mfa.paths.js";
import { profilePaths } from "./paths/profile.paths.js";
import { schemas } from "./schemas.js";

// EACH ROUTER GROUP DOCUMENTS ITS OWN PATHS IN ./paths/*.paths.ts.
// ADD A NEW ROUTE GROUP BY CREATING A FILE THERE AND SPREADING IT INTO `paths` BELOW.
export function buildOpenApiDocument(port: string | number = DEFAULT_PORT) {
  return {
    openapi: "3.0.3",
    info: {
      title: "MERN Auth API",
      version: "1.0.0",
      description: "REST API for authentication, MFA, and profile management.",
    },
    servers: [{ url: `http://localhost:${port}/api/v1`, description: "Local" }],
    tags: [
      { name: "Auth", description: "Signup, login, password reset" },
      { name: "MFA", description: "Multi-factor authentication" },
      { name: "Profile", description: "Authenticated user profile" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas,
    },
    paths: {
      ...authPaths,
      ...mfaPaths,
      ...profilePaths,
    },
  };
}
