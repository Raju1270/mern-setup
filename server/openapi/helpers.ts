import { z } from "zod";

// TURN A ZOD SCHEMA INTO AN OPENAPI-COMPATIBLE JSON SCHEMA.
// ZOD VALIDATORS STAY THE SINGLE SOURCE OF TRUTH — NO SCHEMA IS HAND-DUPLICATED HERE.
export const toOpenApiSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "openapi-3.0", io: "input", unrepresentable: "any" });

export const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
});

export const bearerAuth = [{ bearerAuth: [] as string[] }];
