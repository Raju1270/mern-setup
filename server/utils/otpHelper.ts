import type { IUser } from "../models/user.model.js";
import { AppError } from "./AppError.js";
import { getKafkaProducer } from "../config/kafka.js";
import { logger } from "../config/logger.js";
import { TOPIC_OTP_EMAIL } from "../config/constants.js";
import { kafkaMessagesPublished } from "../config/metrics.js";

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOtpExpiry = () => {
  const minutes = Number.parseInt(process.env.OTP_EXPIRY_MINUTES || "5");
  return new Date(Date.now() + minutes * 60 * 1000);
};

const getMaxAttempts = () => Number.parseInt(process.env.OTP_MAX_ATTEMPTS || "5");

export const createOtpData = () => ({
  otp: generateOTP(),
  otpExpiry: getOtpExpiry(),
  maxAttempts: getMaxAttempts(),
});

export const clearOtp = (user: IUser) => {
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
};

export const clearMfaOtp = (user: IUser) => {
  user.mfaOtp = undefined;
  user.mfaOtpExpiry = undefined;
  user.mfaAttempts = 0;
};

export const validateOtp = async (
  user: IUser,
  otp: string,
  otpField: "otp" | "mfaOtp",
  expiryField: "otpExpiry" | "mfaOtpExpiry",
  attemptsField: "otpAttempts" | "mfaAttempts",
  onMaxAttempts: () => Promise<void>
) => {
  if (!user[otpField] || !user[expiryField]) {
    throw new AppError("OTP not found. Please request a new one.", 400);
  }

  if (user[expiryField]! < new Date()) {
    if (otpField === "otp") clearOtp(user);
    else clearMfaOtp(user);
    await user.save();
    throw new AppError("OTP has expired. Please request a new one.", 400);
  }

  if (user[otpField] !== otp) {
    user[attemptsField] = (user[attemptsField] || 0) + 1;
    const remaining = createOtpData().maxAttempts - user[attemptsField];

    if (remaining <= 0) {
      await onMaxAttempts();
    }

    await user.save();
    throw new AppError(
      `Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      400
    );
  }

  user[attemptsField] = 0;
};

// QUEUES THE OTP EMAIL FOR notification-service TO SEND — DECOUPLED FROM THE REQUEST PATH.
// A KAFKA PUBLISH FAILURE STILL FAILS THE REQUEST: THE USER CANNOT PROCEED WITHOUT THE OTP,
// SO SILENTLY SUCCEEDING WOULD STRAND THEM WITH NO WAY TO GET THE CODE.
export const sendOTPEmail = async (
  email: string,
  otp: string,
  subject = "OTP Verification"
): Promise<void> => {
  try {
    await getKafkaProducer().send({
      topic: TOPIC_OTP_EMAIL,
      messages: [{ key: email, value: JSON.stringify({ email, otp, subject }) }],
    });
    kafkaMessagesPublished.inc({ topic: TOPIC_OTP_EMAIL, status: "success" });
  } catch (err) {
    kafkaMessagesPublished.inc({ topic: TOPIC_OTP_EMAIL, status: "failure" });
    logger.error({ err, email, subject }, "Failed to queue OTP email");
    throw new AppError("Failed to queue OTP email. Please try again later.", 500);
  }
};
