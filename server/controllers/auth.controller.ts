import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import {
  deactivateAccount,
  getUserProfile,
  performLogin,
  performMfaLoginVerification,
  resetUserPassword,
  sendPasswordResetOTP,
  signupUser,
  toggleMFARequest,
  updateUserProfile,
  verifyMFAToggle,
  verifySignupOTP,
  verifyUserOTP,
} from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken, getClientIp } from "../utils/authHelpers.js";

export const signup = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    const userData = await signupUser(name, email, password);

    res.status(201).json({
      success: true,
      userId: userData.userId,
      email: userData.email,
      message: "OTP sent to your email. Please verify to complete registration.",
    });
  }
);

export const verifySignup = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, otp } = req.body;

    // VERIFY OTP AND ACTIVATE ACCOUNT.
    const userData = await verifySignupOTP(email, otp);

    const accessToken = generateToken(userData.userId.toString(), userData.role);

    res.json({
      success: true,
      accessToken,
      userId: userData.userId,
      userName: userData.userName,
      email: userData.email,
      role: userData.role,
      profilePhoto: null,
      mfaEnabled: false,
    });
  }
);

export const login = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    const result = await performLogin(email, password, getClientIp(req));

    if (result.mfaRequired) {
      res.json({
        success: true,
        mfaRequired: true,
        userId: result.userId,
        email: result.email,
        message: "MFA code sent to your email",
      });
      return;
    }

    res.json({
      success: true,
      accessToken: result.accessToken,
      userId: result.userId,
      userName: result.userName,
      email: result.email,
      role: result.role,
      profilePhoto: result.profilePhoto,
      mfaEnabled: result.mfaEnabled,
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
export const toggleMFAController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await toggleMFARequest(userId);

    res.json(result);
  }
);

export const verifyMFAToggleController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    const { otp } = req.body;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await verifyMFAToggle(userId, otp);

    res.json(result);
  }
);

export const verifyMFALogin = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { userId, email, otp } = req.body;

    const result = await performMfaLoginVerification(userId, email, otp, getClientIp(req));

    res.json({
      success: true,
      accessToken: result.accessToken,
      userId: result.userId,
      userName: result.userName,
      email: result.email,
      role: result.role,
      profilePhoto: result.profilePhoto,
      mfaEnabled: result.mfaEnabled,
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
