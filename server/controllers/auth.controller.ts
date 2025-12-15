import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import {
  deactivateAccount,
  disableMFA,
  enableMFA,
  getUserProfile,
  loginUser,
  resetUserPassword,
  sendMFACode,
  sendPasswordResetOTP,
  signupUser,
  updateUserProfile,
  verifyMFACode,
  verifyMFASetup,
  verifyUserOTP,
} from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { comparePassword, generateToken } from "../utils/authHelpers.js";

export const signup = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    // CREATE USER.
    const userData = await signupUser(name, email, password);

    const accessToken = generateToken(userData.userId.toString(), userData.role);

    res.status(201).json({
      success: true,
      accessToken,
      ...userData,
    });
  }
);

export const login = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    // FIND USER.
    const user = await loginUser(email);
    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    if (!user.active) {
      return next(new AppError("Account is deactivated. Please contact support.", 403));
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // CHECK IF MFA IS ENABLED
    if (user.mfaEnabled) {
      // Send MFA code
      await sendMFACode(user._id.toString(), user.email);

      res.json({
        success: true,
        mfaRequired: true,
        userId: user._id,
        email: user.email,
        message: "MFA code sent to your email",
      });
      return;
    }

    // UPDATE LOGIN TRACKING.
    user.lastLogin = new Date();
    user.loginIp = req.ip || req.socket.remoteAddress || "unknown";
    await user.save();

    const accessToken = generateToken(user._id.toString(), user.role);

    res.json({
      success: true,
      accessToken,
      userId: user._id,
      userName: user.name,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body;

    await sendPasswordResetOTP(email);

    res.json({
      success: true,
      message: "OTP sent to your email",
    });
  }
);

export const verifyOTP = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, otp } = req.body;

    await verifyUserOTP(email, otp);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  }
);

export const resetPassword = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    await resetUserPassword(email, password);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  }
);

// MFA CONTROLLERS
export const enableMFAController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await enableMFA(userId);

    res.json(result);
  }
);

export const verifyMFASetupController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    const { otp } = req.body;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await verifyMFASetup(userId, otp);

    res.json(result);
  }
);

export const disableMFAController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await disableMFA(userId);

    res.json(result);
  }
);

export const verifyMFALogin = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { userId, email, otp } = req.body;

    const result = await verifyMFACode(userId, email, otp);

    const accessToken = generateToken(result.user._id.toString(), result.user.role);

    res.json({
      success: true,
      accessToken,
      userId: result.user._id,
      userName: result.user.name,
      email: result.user.email,
      role: result.user.role,
      mfaEnabled: result.user.mfaEnabled,
    });
  }
);

// PROFILE CONTROLLERS
export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const profile = await getUserProfile(userId);

    res.json({
      success: true,
      user: profile,
    });
  }
);

export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    const { name, profilePhoto } = req.body;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const updatedProfile = await updateUserProfile(userId, { name, profilePhoto });

    res.json({
      success: true,
      user: updatedProfile,
    });
  }
);

export const deactivateAccountController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await deactivateAccount(userId);

    res.json(result);
  }
);
