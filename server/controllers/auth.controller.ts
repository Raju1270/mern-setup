import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import {
  deactivateAccount,
  getUserProfile,
  loginUser,
  resetUserPassword,
  sendMFACode,
  sendPasswordResetOTP,
  signupUser,
  toggleMFARequest,
  updateUserProfile,
  verifyMFACode,
  verifyMFAToggle,
  verifySignupOTP,
  verifyUserOTP,
} from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { comparePassword, generateToken, getClientIp } from "../utils/authHelpers.js";

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

    // FIND USER.

    const user = await loginUser(email);

    if (!user) {
      return next(new AppError("No user found ", 401));
    }

    if (!user.emailVerified) {
      return next(new AppError("Please verify your email before logging in.", 403));
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
    user.loginIp = getClientIp(req);
    await user.save();

    const accessToken = generateToken(user._id.toString(), user.role);

    res.json({
      success: true,
      accessToken,
      userId: user._id,
      userName: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
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

    const result = await verifyMFACode(userId, email, otp);

    result.user.loginIp = getClientIp(req);
    await result.user.save();

    const accessToken = generateToken(result.user._id.toString(), result.user.role);

    res.json({
      success: true,
      accessToken,
      userId: result.user._id,
      userName: result.user.name,
      email: result.user.email,
      role: result.user.role,
      profilePhoto: result.user.profilePhoto,
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
