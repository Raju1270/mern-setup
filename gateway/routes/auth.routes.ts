import type { Router as RouterType } from "express";
import { Router } from "express";
import {
  deactivateAccountController,
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  signup,
  toggleMFAController,
  updateProfile,
  verifyMFALogin,
  verifyMFAToggleController,
  verifyOTP,
  verifySignup,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  verifyMFASchema,
  verifyOTPSchema,
} from "../validators/auth.schema.js";

const router: RouterType = Router();

router.post("/signup", validate(signupSchema, "body"), signup);
router.post("/verify-signup", validate(verifyOTPSchema, "body"), verifySignup);
router.post("/login", validate(loginSchema, "body"), login);

router.post("/forgot-password", validate(forgotPasswordSchema, "body"), forgotPassword);
router.post("/verify-otp", validate(verifyOTPSchema, "body"), verifyOTP);
router.post("/reset-password", validate(resetPasswordSchema, "body"), resetPassword);

router.post("/mfa/verify-login", validate(verifyMFASchema, "body"), verifyMFALogin);

router.post("/mfa/toggle", authenticate, toggleMFAController);
router.post(
  "/mfa/verify-toggle",
  authenticate,
  validate(verifyMFASchema, "body"),
  verifyMFAToggleController
);

router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, validate(updateProfileSchema, "body"), updateProfile);
router.post("/deactivate", authenticate, deactivateAccountController);

export default router;
