import nodemailer from "nodemailer";
import { AppError } from "../utils/AppError.js";

let transporter: nodemailer.Transporter | null = null;
let isVerified = false;

export const validateEmailConfig = (): void => {
  const requiredVars = ["SMTP_USER", "SMTP_PASS"];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new AppError(`Missing required email configuration: ${missing.join(", ")}`, 500);
  }
};

export const getEmailTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    validateEmailConfig();

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true, // USE POOLED CONNECTIONS FOR BETTER PERFORMANCE
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000, // RATE LIMITING: 1 SECOND between messages
      rateLimit: 5, // MAX 5 MESSAGES PER RATEDELTA
    });

    // VERIFY CONNECTION CONFIGURATION (ASYNC, DOESN'T BLOCK INITIALIZATION)
    if (!isVerified) {
      const verifyTransporter = transporter; // CAPTURE FOR CLOSURE
      verifyTransporter
        .verify()
        .then(() => {
          isVerified = true;
          console.log("✅ SMTP server is ready to send emails");
        })
        .catch((error) => {
          console.error("❌ SMTP connection error:", error.message);
          transporter = null; // RESET TO RETRY NEXT TIME
        });
    }
  }

  if (!transporter) {
    throw new AppError("Email transporter is not initialized", 500);
  }

  return transporter;
};

export const closeEmailTransporter = async (): Promise<void> => {
  if (transporter) {
    transporter.close();
    transporter = null;
    isVerified = false;
    console.log("Email transporter closed");
  }
};
