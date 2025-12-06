import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// ZOD VALIDATION MIDDLEWARE.
export const validate =
  (schema: ZodType, source: "body" | "params" | "query" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: result.error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
      return;
    }

    req[source] = result.data;
    next();
  };
