import { DEFAULT_PROFILE_CACHE_TTL } from "../config/constants.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { comparePassword, generateToken, hashPassword } from "../utils/authHelpers.js";
import { deleteCache, withCache } from "../utils/cache.js";
import { publishAuthEvent } from "../utils/domainEvents.js";
import {
  clearMfaOtp,
  clearOtp,
  createOtpData,
  sendOTPEmail,
  validateOtp,
} from "../utils/otpHelper.js";

// EXPLICIT undefined CHECK (NOT `||`) SO PROFILE_CACHE_TTL=0 (INTENTIONALLY DISABLING CACHING —
// SEE withCache's ttlSeconds <= 0 SHORT-CIRCUIT) ISN'T TREATED AS "UNSET" AND SILENTLY
// OVERRIDDEN BACK TO THE DEFAULT.
const PROFILE_CACHE_TTL =
  process.env.PROFILE_CACHE_TTL !== undefined
    ? Number(process.env.PROFILE_CACHE_TTL)
    : Number(DEFAULT_PROFILE_CACHE_TTL);
const profileCacheKey = (userId: string) => `profile:${userId}`;

export const signupUser = async (name: string, email: string, password: string) => {
  const existingUser = await User.findOne({ email });

  // ALLOW RE-SIGNUP FOR UNVERIFIED USERS.
  if (existingUser && !existingUser.emailVerified) {
    const { otp, otpExpiry } = createOtpData();

    existingUser.name = name;
    existingUser.password = await hashPassword(password);
    existingUser.otp = otp;
    existingUser.otpExpiry = otpExpiry;
    existingUser.otpAttempts = 0;

    await existingUser.save();
    await sendOTPEmail(email, otp, "Email Verification");

    return { userId: existingUser._id, email: existingUser.email };
  }

  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  const { otp, otpExpiry } = createOtpData();
  const user = await User.create({
    name,
    email,
    password: await hashPassword(password),
    otp,
    otpExpiry,
    otpAttempts: 0,
    emailVerified: false,
    active: false,
  });

  await sendOTPEmail(email, otp, "Email Verification");
  return { userId: user._id, email: user.email };
};

export const verifySignupOTP = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select("+otp +otpExpiry +otpAttempts");

  if (!user) throw new AppError("User not found", 404);
  if (user.emailVerified) throw new AppError("Email already verified", 400);

  await validateOtp(user, otp, "otp", "otpExpiry", "otpAttempts", async () => {
    await User.deleteOne({ _id: user._id });
    throw new AppError("Maximum attempts exceeded. Please signup again.", 403);
  });

  user.emailVerified = true;
  user.active = true;
  clearOtp(user);
  await user.save();

  return { userId: user._id, userName: user.name, email: user.email, role: user.role };
};

export const loginUser = async (email: string) => User.findOne({ email });

export const sendPasswordResetOTP = async (email: string) => {
  const user = await User.findOne({ email }).select("+otpAttempts");

  if (!user) throw new AppError("User not found", 404);
  if (!user.active) throw new AppError("Account is deactivated", 403);

  const { otp, otpExpiry } = createOtpData();
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;
  await user.save();
  await sendOTPEmail(email, otp, "Password Reset");

  return { success: true };
};

export const verifyUserOTP = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select("+otp +otpExpiry +otpAttempts");

  if (!user) throw new AppError("User not found", 404);
  if (!user.active) throw new AppError("Account is deactivated", 403);

  await validateOtp(user, otp, "otp", "otpExpiry", "otpAttempts", async () => {
    user.active = false;
    clearOtp(user);
    await user.save();
    throw new AppError("Account locked due to too many failed attempts.", 403);
  });

  await user.save();
  return { success: true };
};

export const resetUserPassword = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select("+otp +otpExpiry");

  if (!user) throw new AppError("User not found", 404);
  if (!user.otp || !user.otpExpiry) throw new AppError("Please verify OTP first", 400);
  if (user.otpExpiry < new Date()) throw new AppError("OTP expired. Start again.", 400);

  user.password = await hashPassword(password);
  clearOtp(user);
  await user.save();
  await publishAuthEvent("password.reset", user._id.toString());

  return { success: true };
};

// MFA SERVICES.
export const toggleMFARequest = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const { otp, otpExpiry } = createOtpData();
  user.mfaOtp = otp;
  user.mfaOtpExpiry = otpExpiry;
  user.mfaAttempts = 0;
  await user.save();

  const action = user.mfaEnabled ? "Disable" : "Enable";
  await sendOTPEmail(user.email, otp, `MFA ${action}`);

  return { success: true, currentStatus: user.mfaEnabled, action: action.toLowerCase() };
};

export const verifyMFAToggle = async (userId: string, otp: string) => {
  const user = await User.findById(userId).select("+mfaOtp +mfaOtpExpiry +mfaAttempts");
  if (!user) throw new AppError("User not found", 404);

  await validateOtp(user, otp, "mfaOtp", "mfaOtpExpiry", "mfaAttempts", async () => {
    clearMfaOtp(user);
    await user.save();
    throw new AppError("Too many failed attempts. Try again later.", 403);
  });

  const newStatus = !user.mfaEnabled;
  user.mfaEnabled = newStatus;
  clearMfaOtp(user);
  await user.save();
  await deleteCache(profileCacheKey(userId));
  await publishAuthEvent("mfa.toggled", userId, { mfaEnabled: newStatus });

  return { success: true, mfaEnabled: newStatus };
};

export const sendMFACode = async (userId: string, email: string) => {
  const user = await User.findOne({ _id: userId, email });

  if (!user) throw new AppError("User not found", 404);
  if (!user.mfaEnabled) throw new AppError("MFA is not enabled", 400);

  const { otp, otpExpiry } = createOtpData();
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

  if (!user) throw new AppError("User not found", 404);
  if (!user.mfaEnabled) throw new AppError("MFA is not enabled", 400);

  await validateOtp(user, otp, "mfaOtp", "mfaOtpExpiry", "mfaAttempts", async () => {
    user.active = false;
    clearMfaOtp(user);
    await user.save();
    throw new AppError("Account locked due to too many failed attempts.", 403);
  });

  clearMfaOtp(user);
  user.lastLogin = new Date();
  await user.save();

  return { success: true, user };
};

// SHARED TAIL OF BOTH LOGIN PATHS BELOW: STAMP lastLogin/loginIp, INVALIDATE THE CACHED PROFILE
// (IT WAS MISSING HERE BEFORE — A USER COULD SEE THEIR PRE-LOGIN lastLogin/loginIp ON /profile
// FOR UP TO PROFILE_CACHE_TTL AFTER LOGGING IN), ISSUE A TOKEN, PUBLISH THE EVENT, AND SHAPE THE
// RESPONSE. EXTRACTED SO performLogin/performMfaLoginVerification DON'T DUPLICATE ALL OF THIS.
const finalizeLogin = async (
  user: NonNullable<Awaited<ReturnType<typeof loginUser>>>,
  clientIp: string
) => {
  user.lastLogin = new Date();
  user.loginIp = clientIp;
  await user.save();
  await deleteCache(profileCacheKey(user._id.toString()));

  const accessToken = generateToken(user._id.toString(), user.role);
  await publishAuthEvent("login", user._id.toString(), { loginIp: user.loginIp });

  return {
    accessToken,
    userId: user._id.toString(),
    userName: user.name,
    email: user.email,
    role: user.role,
    profilePhoto: user.profilePhoto,
    mfaEnabled: user.mfaEnabled,
  };
};

// FULL LOGIN ORCHESTRATION (PASSWORD CHECK, MFA BRANCH, TRACKING, TOKEN, EVENT) — SHARED BY
// THE REST CONTROLLER AND THE gRPC HANDLER SO NEITHER RE-IMPLEMENTS IT. clientIp COMES FROM
// WHICHEVER TRANSPORT RECEIVED THE ORIGINAL REQUEST (req.ip FOR REST, A FORWARDED FIELD FOR gRPC).
export const performLogin = async (email: string, password: string, clientIp: string) => {
  const user = await loginUser(email);

  if (!user) throw new AppError("No user found ", 401);
  if (!user.emailVerified) {
    throw new AppError("Please verify your email before logging in.", 403);
  }
  if (!user.active) throw new AppError("Account is deactivated. Please contact support.", 403);

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) throw new AppError("Invalid email or password", 401);

  if (user.mfaEnabled) {
    await sendMFACode(user._id.toString(), user.email);
    return {
      mfaRequired: true as const,
      userId: user._id.toString(),
      email: user.email,
    };
  }

  const result = await finalizeLogin(user, clientIp);
  return { mfaRequired: false as const, ...result };
};

// COMPLETES A LOGIN THAT WAS PAUSED FOR MFA — SAME SHARING RATIONALE AS performLogin.
export const performMfaLoginVerification = async (
  userId: string,
  email: string,
  otp: string,
  clientIp: string
) => {
  const { user } = await verifyMFACode(userId, email, otp);
  return finalizeLogin(user, clientIp);
};

// PROFILE SERVICES.
export const getUserProfile = async (userId: string) =>
  withCache(profileCacheKey(userId), PROFILE_CACHE_TTL, async () => {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

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
  });

export const updateUserProfile = async (
  userId: string,
  updates: { name?: string; profilePhoto?: string }
) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (updates.name) user.name = updates.name;
  if (updates.profilePhoto) user.profilePhoto = updates.profilePhoto;
  await user.save();
  await deleteCache(profileCacheKey(userId));

  return {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
    profilePhoto: user.profilePhoto,
    mfaEnabled: user.mfaEnabled,
  };
};

export const deactivateAccount = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  user.active = false;
  await user.save();
  await deleteCache(profileCacheKey(userId));
  await publishAuthEvent("account.deactivated", userId);

  return { success: true };
};
