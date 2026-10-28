import { getEmailTransporter } from "../config/emailConfig.js";
import { logger } from "../config/logger.js";

export interface OtpEmailPayload {
  email: string;
  otp: string;
  subject: string;
}

// SENDS AN OTP EMAIL WITH RETRIES. THROWS ONLY AFTER ALL RETRIES ARE EXHAUSTED — THE CALLER
// (THE KAFKA MESSAGE HANDLER) DECIDES WHETHER TO ACK OR LEAVE THE MESSAGE FOR REPROCESSING.
export const sendOtpEmail = async ({ email, otp, subject }: OtpEmailPayload): Promise<void> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transporter = getEmailTransporter();

      const fromName = process.env.SMTP_FROM_NAME || "Demo Application";
      const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || "5";

      const htmlContent = HtmlOtpTemplate.replace("{{.Otp}}", otp)
        .replace("{{.FullName}}", email.split("@")[0])
        .replace("{{.SMTP_FROM_NAME}}", fromName)
        .replace("{{.ExpiryMinutes}}", expiryMinutes);

      await transporter.sendMail({
        from: `"${fromName}" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: htmlContent,
      });

      return;
    } catch (error) {
      lastError = error as Error;
      logger.error({ err: error, attempt, maxRetries, email }, "Failed to send OTP email");

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
  }

  // ALL RETRIES FAILED.
  throw lastError ?? new Error("Failed to send OTP email after all retries");
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
                <p style="color: #6e6e73; font-size: 14px; margin: 0;">{{.SMTP_FROM_NAME}}</p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td><hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;"></td>
            </tr>

            <!-- OTP Content -->
          <tr>
            <td style="padding: 32px; text-align: center;">
              <p style="font-size: 16px; margin: 0 0 16px;">Dear {{.FullName}},</p>
              <p style="font-size: 15px; margin: 0 0 24px;">Use the following One-Time Password (OTP) to complete your verification:</p>

              <div style="display: inline-block; padding: 16px 32px; background-color: #f2f2f7; border-radius: 8px; font-size: 24px; font-weight: bold; color: #1c1c1e; letter-spacing: 4px;">{{.Otp}}</div>
                <p style="font-size: 14px; color: #6e6e73; margin: 24px 0 0;">This OTP is valid for the next {{.ExpiryMinutes}} minutes.</p>
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
