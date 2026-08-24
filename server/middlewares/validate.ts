import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

// ZOD VALIDATION MIDDLEWARE.
export const validate =
  (schema: ZodType, source: "body" | "params" | "query" = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      next(new AppError("Validation failed", 400, errors));
      return;
    }

    req[source] = result.data;
    next();
  };
