import type { Router as RouterType } from "express";
import { Router } from "express";
import {
  forgotPassword,
  login,
  resetPassword,
  signup,
  verifyOTP,
  enableMFAController,
  verifyMFASetupController,
  disableMFAController,
  verifyMFALogin,
  getProfile,
  updateProfile,
  deactivateAccountController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyOTPSchema,
  verifyMFASchema,
  updateProfileSchema,
} from "../validators/auth.schema.js";

const router: RouterType = Router();

router.post("/signup", validate(signupSchema, "body"), signup);
router.post("/login", validate(loginSchema, "body"), login);


router.post("/forgot-password", validate(forgotPasswordSchema, "body"), forgotPassword);
router.post("/verify-otp", validate(verifyOTPSchema, "body"), verifyOTP);
router.post("/reset-password", validate(resetPasswordSchema, "body"), resetPassword);


router.post("/mfa/verify-login", validate(verifyMFASchema, "body"), verifyMFALogin);


router.post("/mfa/enable", authenticate, enableMFAController);
router.post("/mfa/verify-setup", authenticate, validate(verifyMFASchema, "body"), verifyMFASetupController);
router.post("/mfa/disable", authenticate, disableMFAController);


router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, validate(updateProfileSchema, "body"), updateProfile);
router.post("/deactivate", authenticate, deactivateAccountController);

export default router;
