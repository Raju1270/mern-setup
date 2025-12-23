import mongoose, { type Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  emailVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  otpAttempts: number;
  mfaEnabled: boolean;
  mfaOtp?: string;
  mfaOtpExpiry?: Date;
  mfaAttempts: number;
  active: boolean;
  profilePhoto?: string;
  lastLogin?: Date;
  loginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaOtp: {
      type: String,
      select: false,
    },
    mfaOtpExpiry: {
      type: Date,
      select: false,
    },
    mfaAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginIp: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
