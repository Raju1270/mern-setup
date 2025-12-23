import nodemailer from "nodemailer";
import type { IUser } from "../models/user.model.js";
import { AppError } from "./AppError.js";
import { getEmailTransporter } from "../config/emailConfig.js";

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

export const sendOTPEmail = async (
  email: string,
  otp: string,
  subject = "OTP Verification"
): Promise<void> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transporter = getEmailTransporter();

      const htmlContent = HtmlOtpTemplate.replace("{{.Otp}}", otp).replace(
        "{{.FullName}}",
        email.split("@")[0]
      );

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || "Demo Application"}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(`Failed to send OTP email (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
  console.error("Failed to send OTP email after all retries:", lastError);
  throw new AppError("Failed to send OTP email. Please try again later.", 500);
};

const HtmlOtpTemplate = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>OTP Verification</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 60px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; border: 1px solid #e5e5e5; border-radius: 12px;">
            
            <!-- Header -->
            <tr>
              <td style="padding: 40px 32px; text-align: center;">
                <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px;">OTP Verification</h1>
                <p style="color: #6e6e73; font-size: 14px; margin: 0;">Demo Applications</p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td><hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;"></td>
            </tr>

            <!-- OTP Content -->
          <!-- OTP Content -->
          <tr>
            <td style="padding: 32px; text-align: center;">
              <p style="font-size: 16px; margin: 0 0 16px;">Dear {{.FullName}},</p>
              <p style="font-size: 15px; margin: 0 0 24px;">Use the following One-Time Password (OTP) to complete your verification:</p>

              <div style="display: inline-block; padding: 16px 32px; background-color: #f2f2f7; border-radius: 8px; font-size: 24px; font-weight: bold; color: #1c1c1e; letter-spacing: 4px;">{{.Otp}}</div>
                <p style="font-size: 14px; color: #6e6e73; margin: 24px 0 0;">This OTP is valid for the next 5 minutes.</p>
            </td>
          </tr>


            <!-- Divider -->
            <tr>
              <td><hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;"></td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 32px; text-align: center; color: #6e6e73; font-size: 13px;">
                <p style="margin: 4px 0;">Didn't request this code? Just ignore this email.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
