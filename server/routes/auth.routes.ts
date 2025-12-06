import type { Router as RouterType } from "express";
import { Router } from "express";
import { login, signup } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema, signupSchema } from "../validators/auth.schema.js";

const router: RouterType = Router();

// PUBLIC ROUTES.
router.post("/signup", validate(signupSchema, "body"), signup);
router.post("/login", validate(loginSchema, "body"), login);

export default router;
