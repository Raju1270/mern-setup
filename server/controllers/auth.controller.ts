import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { comparePassword, generateToken, hashPassword } from "../utils/authHelpers.js";

// SIGNUP CONTROLLER.
export const signup = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    // CHECK IF USER EXISTS.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("Email already registered", 409));
    }

    // HASH PASSWORD.
    const hashedPassword = await hashPassword(password);

    // CREATE USER.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    // GENERATE TOKEN.
    const accessToken = generateToken(user._id.toString());

    // SEND RESPONSE.
    res.status(201).json({
      success: true,
      accessToken,
      userId: user._id,
      userName: user.name,
      email: user.email,
      role: user.role,
    });
  }
);

// LOGIN CONTROLLER.
export const login = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    // FIND USER.
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // VERIFY PASSWORD.
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // GENERATE TOKEN.
    const accessToken = generateToken(user._id.toString());

    // SEND RESPONSE.
    res.json({
      success: true,
      accessToken,
      userId: user._id,
      userName: user.name,
      email: user.email,
      role: user.role,
    });
  }
);
