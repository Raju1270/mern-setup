import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getClientIp } from "../utils/getClientIp.js";
import { callAuthService } from "../grpc/client.js";

// EVERY HANDLER BELOW RETURNS THE EXACT SAME JSON SHAPE server's REST CONTROLLER USED TO —
// THE BROWSER CLIENT SEES NO DIFFERENCE. THE ONLY CHANGE IS WHAT HAPPENS INTERNALLY:
// callAuthService() OVER gRPC INSTEAD OF A DIRECT SERVICE-LAYER CALL.

export const signup = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    const data = await callAuthService<
      { name: string; email: string; password: string },
      { userId: string; email: string; message: string }
    >("Signup", { name, email, password });

    res.status(201).json({
      success: true,
      userId: data.userId,
      email: data.email,
      message: data.message,
    });
  }
);

export const verifySignup = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, otp } = req.body;

    const data = await callAuthService<
      { email: string; otp: string },
      {
        accessToken: string;
        userId: string;
        userName: string;
        email: string;
        role: string;
        profilePhoto: string;
        mfaEnabled: boolean;
      }
    >("VerifySignup", { email, otp });

    res.json({
      success: true,
      accessToken: data.accessToken,
      userId: data.userId,
      userName: data.userName,
      email: data.email,
      role: data.role,
      profilePhoto: data.profilePhoto || null,
      mfaEnabled: data.mfaEnabled,
    });
  }
);

interface LoginGrpcResponse {
  mfaRequired: boolean;
  message: string;
  accessToken: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  profilePhoto: string;
  mfaEnabled: boolean;
}

export const login = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    const data = await callAuthService<
      { email: string; password: string; clientIp: string },
      LoginGrpcResponse
    >("Login", { email, password, clientIp: getClientIp(req) });

    if (data.mfaRequired) {
      res.json({
        success: true,
        mfaRequired: true,
        userId: data.userId,
        email: data.email,
        message: data.message,
      });
      return;
    }

    res.json({
      success: true,
      accessToken: data.accessToken,
      userId: data.userId,
      userName: data.userName,
      email: data.email,
      role: data.role,
      profilePhoto: data.profilePhoto || null,
      mfaEnabled: data.mfaEnabled,
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body;

    const data = await callAuthService<{ email: string }, { message: string }>(
      "ForgotPassword",
      { email }
    );

    res.json({ success: true, message: data.message });
  }
);

export const verifyOTP = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, otp } = req.body;

    const data = await callAuthService<{ email: string; otp: string }, { message: string }>(
      "VerifyOtp",
      { email, otp }
    );

    res.json({ success: true, message: data.message });
  }
);

export const resetPassword = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    const data = await callAuthService<
      { email: string; password: string },
      { message: string }
    >("ResetPassword", { email, password });

    res.json({ success: true, message: data.message });
  }
);

// MFA CONTROLLERS
export const toggleMFAController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const data = await callAuthService<
      { userId: string },
      { success: boolean; currentStatus: boolean; action: string }
    >("ToggleMfa", { userId });

    res.json(data);
  }
);

export const verifyMFAToggleController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    const { otp } = req.body;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const data = await callAuthService<
      { userId: string; otp: string },
      { success: boolean; mfaEnabled: boolean }
    >("VerifyMfaToggle", { userId, otp });

    res.json(data);
  }
);

export const verifyMFALogin = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { userId, email, otp } = req.body;

    const data = await callAuthService<
      { userId: string; email: string; otp: string; clientIp: string },
      {
        accessToken: string;
        userId: string;
        userName: string;
        email: string;
        role: string;
        profilePhoto: string;
        mfaEnabled: boolean;
      }
    >("VerifyMfaLogin", { userId, email, otp, clientIp: getClientIp(req) });

    res.json({
      success: true,
      accessToken: data.accessToken,
      userId: data.userId,
      userName: data.userName,
      email: data.email,
      role: data.role,
      profilePhoto: data.profilePhoto || null,
      mfaEnabled: data.mfaEnabled,
    });
  }
);

// PROFILE CONTROLLERS
interface ProfileGrpcResponse {
  userId: string;
  userName: string;
  email: string;
  role: string;
  profilePhoto: string;
  mfaEnabled: boolean;
  lastLogin: string;
  active: boolean;
  createdAt: string;
}

export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const data = await callAuthService<{ userId: string }, ProfileGrpcResponse>("GetProfile", {
      userId,
    });

    res.json({
      success: true,
      user: {
        userId: data.userId,
        userName: data.userName,
        email: data.email,
        role: data.role,
        profilePhoto: data.profilePhoto || null,
        mfaEnabled: data.mfaEnabled,
        lastLogin: data.lastLogin || null,
        active: data.active,
        createdAt: data.createdAt,
      },
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

    const data = await callAuthService<
      { userId: string; name?: string; profilePhoto?: string },
      ProfileGrpcResponse
    >("UpdateProfile", { userId, name, profilePhoto });

    res.json({
      success: true,
      user: {
        userId: data.userId,
        userName: data.userName,
        email: data.email,
        role: data.role,
        profilePhoto: data.profilePhoto || null,
        mfaEnabled: data.mfaEnabled,
      },
    });
  }
);

export const deactivateAccountController = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const data = await callAuthService<{ userId: string }, { success: boolean }>("Deactivate", {
      userId,
    });

    res.json(data);
  }
);
