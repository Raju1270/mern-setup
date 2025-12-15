import { User } from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "../utils/authHelpers.js";
import { generateOTP, sendOTPEmail } from "../utils/otpHelper.js";

export const signupUser = async (name: string, email: string, password: string) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "user",
  });

  return {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
  };
};

export const loginUser = async (email: string) => {
  const user = await User.findOne({ email });
  return user ? user : null;
};

export const sendPasswordResetOTP = async (email: string) => {
  const user = await User.findOne({ email }).select("+otpAttempts");
  if (!user) {
    throw new AppError("User not found with this email", 404);
  }

  if (!user.active) {
    throw new AppError("Account is deactivated. Please contact support.", 403);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;
  await user.save();

  await sendOTPEmail(email, otp);

  return { success: true };
};

export const verifyUserOTP = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select("+otp +otpExpiry +otpAttempts");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.active) {
    throw new AppError("Account is deactivated. Please contact support.", 403);
  }

  if (!user.otp || !user.otpExpiry) {
    throw new AppError("OTP not found. Please request a new one", 400);
  }

  if (user.otpExpiry < new Date()) {
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();
    throw new AppError("OTP has expired. Please request a new one", 400);
  }

  if (user.otp !== otp) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    if (user.otpAttempts >= 5) {
      user.active = false;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      throw new AppError(
        "Too many failed attempts. Account has been locked. Please contact support.",
        403
      );
    }

    await user.save();
    throw new AppError(`Invalid OTP. ${5 - user.otpAttempts} attempts remaining`, 400);
  }

  user.otpAttempts = 0;
  await user.save();

  return { success: true };
};

export const resetUserPassword = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select("+otp +otpExpiry +otpAttempts");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.otp || !user.otpExpiry) {
    throw new AppError("Please verify OTP first", 400);
  }

  if (user.otpExpiry < new Date()) {
    throw new AppError("OTP has expired. Please start the process again", 400);
  }

  const hashedPassword = await hashPassword(password);

  user.password = hashedPassword;
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
  await user.save();

  return { success: true };
};

// MFA SERVICES
export const enableMFA = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.mfaEnabled) {
    throw new AppError("MFA is already enabled", 400);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.mfaOtp = otp;
  user.mfaOtpExpiry = otpExpiry;
  user.mfaAttempts = 0;
  await user.save();

  await sendOTPEmail(user.email, otp, "MFA Setup");

  return { success: true, message: "OTP sent to your email" };
};

export const verifyMFASetup = async (userId: string, otp: string) => {
  const user = await User.findById(userId).select("+mfaOtp +mfaOtpExpiry +mfaAttempts");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.mfaOtp || !user.mfaOtpExpiry) {
    throw new AppError("MFA OTP not found. Please request a new one", 400);
  }

  if (user.mfaOtpExpiry < new Date()) {
    user.mfaOtp = undefined;
    user.mfaOtpExpiry = undefined;
    user.mfaAttempts = 0;
    await user.save();
    throw new AppError("OTP has expired. Please request a new one", 400);
  }

  if (user.mfaOtp !== otp) {
    user.mfaAttempts = (user.mfaAttempts || 0) + 1;

    if (user.mfaAttempts >= 5) {
      user.mfaOtp = undefined;
      user.mfaOtpExpiry = undefined;
      user.mfaAttempts = 0;
      await user.save();
      throw new AppError("Too many failed attempts. Please start the MFA setup again.", 403);
    }

    await user.save();
    throw new AppError(`Invalid OTP. ${5 - user.mfaAttempts} attempts remaining`, 400);
  }

  user.mfaEnabled = true;
  user.mfaOtp = undefined;
  user.mfaOtpExpiry = undefined;
  user.mfaAttempts = 0;
  await user.save();

  return { success: true, message: "MFA enabled successfully" };
};

export const disableMFA = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.mfaEnabled) {
    throw new AppError("MFA is not enabled", 400);
  }

  user.mfaEnabled = false;
  user.mfaOtp = undefined;
  user.mfaOtpExpiry = undefined;
  user.mfaAttempts = 0;
  await user.save();

  return { success: true, message: "MFA disabled successfully" };
};

export const sendMFACode = async (userId: string, email: string) => {
  const user = await User.findOne({ _id: userId, email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.mfaEnabled) {
    throw new AppError("MFA is not enabled for this account", 400);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.mfaOtp = otp;
  user.mfaOtpExpiry = otpExpiry;
  user.mfaAttempts = 0;
  await user.save();

  await sendOTPEmail(email, otp, "MFA Verification");

  return { success: true };
};

export const verifyMFACode = async (userId: string, email: string, otp: string) => {
  const user = await User.findOne({ _id: userId, email }).select(
    "+mfaOtp +mfaOtpExpiry +mfaAttempts"
  );
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.mfaEnabled) {
    throw new AppError("MFA is not enabled", 400);
  }

  if (!user.mfaOtp || !user.mfaOtpExpiry) {
    throw new AppError("MFA OTP not found. Please request a new one", 400);
  }

  if (user.mfaOtpExpiry < new Date()) {
    user.mfaOtp = undefined;
    user.mfaOtpExpiry = undefined;
    user.mfaAttempts = 0;
    await user.save();
    throw new AppError("OTP has expired. Please request a new one", 400);
  }

  if (user.mfaOtp !== otp) {
    user.mfaAttempts = (user.mfaAttempts || 0) + 1;

    if (user.mfaAttempts >= 5) {
      user.active = false;
      user.mfaOtp = undefined;
      user.mfaOtpExpiry = undefined;
      await user.save();
      throw new AppError(
        "Too many failed attempts. Account has been locked. Please contact support.",
        403
      );
    }

    await user.save();
    throw new AppError(`Invalid OTP. ${5 - user.mfaAttempts} attempts remaining`, 400);
  }

  user.mfaOtp = undefined;
  user.mfaOtpExpiry = undefined;
  user.mfaAttempts = 0;
  user.lastLogin = new Date();
  await user.save();

  return { success: true, user };
};

// PROFILE SERVICES
export const updateUserProfile = async (
  userId: string,
  updates: { name?: string; profilePhoto?: string }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (updates.name) {
    user.name = updates.name;
  }

  if (updates.profilePhoto) {
    user.profilePhoto = updates.profilePhoto;
  }

  await user.save();

  return {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
    profilePhoto: user.profilePhoto,
    mfaEnabled: user.mfaEnabled,
  };
};

export const getUserProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
    profilePhoto: user.profilePhoto,
    mfaEnabled: user.mfaEnabled,
    lastLogin: user.lastLogin,
    active: user.active,
    createdAt: user.createdAt,
  };
};

export const deactivateAccount = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.active = false;
  await user.save();

  return { success: true, message: "Account deactivated successfully" };
};
