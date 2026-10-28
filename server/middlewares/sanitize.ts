import type { NextFunction, Request, Response } from "express";
import mongoSanitize from "express-mongo-sanitize";

// STRIPS $/. OPERATOR KEYS FROM body/params IN PLACE (BLOCKS NOSQL OPERATOR INJECTION).
// req.query IS SKIPPED: EXPRESS 5 MAKES IT A GETTER WITH NO SETTER, SO REASSIGNING IT
// THROWS — AND NO ROUTE IN THIS APP READS req.query ANYWAY.
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.params);
  next();
};
