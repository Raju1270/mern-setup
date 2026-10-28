import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { grpcRequestDuration } from "../config/metrics.js";
import {
  deactivateAccount,
  getUserProfile,
  performLogin,
  performMfaLoginVerification,
  resetUserPassword,
  sendPasswordResetOTP,
  signupUser,
  toggleMFARequest,
  updateUserProfile,
  verifyMFAToggle,
  verifySignupOTP,
  verifyUserOTP,
} from "../services/auth.service.js";
import { generateToken } from "../utils/authHelpers.js";
import { logger } from "../config/logger.js";
import { toGrpcError } from "./errorMapping.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/grpc/server.ts (OR COMPILED dist/grpc/server.js) -> ../../proto/auth.proto -> repo-root/proto.
const PROTO_PATH = path.resolve(__dirname, "../../proto/auth.proto");

// A HANDLER JUST DOES: RUN THE SAME SERVICE-LAYER FUNCTION THE REST CONTROLLER CALLS, THEN
// EITHER RESPOND OR TRANSLATE A THROWN AppError INTO A gRPC STATUS. NO BUSINESS LOGIC LIVES HERE.
// method IS ONLY USED TO LABEL grpcRequestDuration — grpc-js DOESN'T EXPOSE THE RPC NAME ON THE
// CALL OBJECT IN A CONVENIENT WAY, SO EACH service{} ENTRY BELOW PASSES ITS OWN NAME EXPLICITLY.
const unary =
  <Req, Res>(method: string, handler: (req: Req) => Promise<Res>) =>
  async (
    call: grpc.ServerUnaryCall<Req, Res>,
    callback: grpc.sendUnaryData<Res>
  ): Promise<void> => {
    const end = grpcRequestDuration.startTimer({ method });
    try {
      const response = await handler(call.request);
      end({ status: "OK" });
      callback(null, response);
    } catch (err) {
      const grpcError = toGrpcError(err);
      end({ status: grpc.status[grpcError.code] ?? String(grpcError.code) });
      callback(grpcError as grpc.ServiceError, null);
    }
  };

const isoOrEmpty = (date: Date | null | undefined): string => (date ? date.toISOString() : "");

const service: grpc.UntypedServiceImplementation = {
  signup: unary("Signup", async (req: { name: string; email: string; password: string }) => {
    const data = await signupUser(req.name, req.email, req.password);
    return {
      success: true,
      userId: data.userId.toString(),
      email: data.email,
      message: "OTP sent to your email. Please verify to complete registration.",
    };
  }),

  verifySignup: unary("VerifySignup", async (req: { email: string; otp: string }) => {
    const data = await verifySignupOTP(req.email, req.otp);
    const accessToken = generateToken(data.userId.toString(), data.role);
    return {
      success: true,
      accessToken,
      userId: data.userId.toString(),
      userName: data.userName,
      email: data.email,
      role: data.role,
      profilePhoto: "",
      mfaEnabled: false,
    };
  }),

  login: unary("Login", async (req: { email: string; password: string; clientIp: string }) => {
    const result = await performLogin(req.email, req.password, req.clientIp);

    if (result.mfaRequired) {
      return {
        success: true,
        mfaRequired: true,
        message: "MFA code sent to your email",
        userId: result.userId,
        email: result.email,
      };
    }

    return {
      success: true,
      mfaRequired: false,
      accessToken: result.accessToken,
      userName: result.userName,
      role: result.role,
      profilePhoto: result.profilePhoto ?? "",
      mfaEnabled: result.mfaEnabled,
      userId: result.userId,
      email: result.email,
    };
  }),

  forgotPassword: unary("ForgotPassword", async (req: { email: string }) => {
    await sendPasswordResetOTP(req.email);
    return { success: true, message: "OTP sent to your email" };
  }),

  verifyOtp: unary("VerifyOtp", async (req: { email: string; otp: string }) => {
    await verifyUserOTP(req.email, req.otp);
    return { success: true, message: "OTP verified successfully" };
  }),

  resetPassword: unary("ResetPassword", async (req: { email: string; password: string }) => {
    await resetUserPassword(req.email, req.password);
    return { success: true, message: "Password reset successfully" };
  }),

  verifyMfaLogin: unary(
    "VerifyMfaLogin",
    async (req: { userId: string; email: string; otp: string; clientIp: string }) => {
      const result = await performMfaLoginVerification(
        req.userId,
        req.email,
        req.otp,
        req.clientIp
      );
      return {
        success: true,
        accessToken: result.accessToken,
        userId: result.userId,
        userName: result.userName,
        email: result.email,
        role: result.role,
        profilePhoto: result.profilePhoto ?? "",
        mfaEnabled: result.mfaEnabled,
      };
    }
  ),

  toggleMfa: unary("ToggleMfa", async (req: { userId: string }) => {
    const result = await toggleMFARequest(req.userId);
    return {
      success: result.success,
      currentStatus: result.currentStatus,
      action: result.action,
    };
  }),

  verifyMfaToggle: unary("VerifyMfaToggle", async (req: { userId: string; otp: string }) => {
    const result = await verifyMFAToggle(req.userId, req.otp);
    return { success: result.success, mfaEnabled: result.mfaEnabled };
  }),

  getProfile: unary("GetProfile", async (req: { userId: string }) => {
    const profile = await getUserProfile(req.userId);
    return {
      userId: profile.userId.toString(),
      userName: profile.userName,
      email: profile.email,
      role: profile.role,
      profilePhoto: profile.profilePhoto ?? "",
      mfaEnabled: profile.mfaEnabled,
      lastLogin: isoOrEmpty(profile.lastLogin),
      active: profile.active,
      createdAt: isoOrEmpty(profile.createdAt),
    };
  }),

  updateProfile: unary(
    "UpdateProfile",
    async (req: { userId: string; name?: string; profilePhoto?: string }) => {
      const profile = await updateUserProfile(req.userId, {
        name: req.name,
        profilePhoto: req.profilePhoto,
      });
      return {
        userId: profile.userId.toString(),
        userName: profile.userName,
        email: profile.email,
        role: profile.role,
        profilePhoto: profile.profilePhoto ?? "",
        mfaEnabled: profile.mfaEnabled,
        lastLogin: "",
        active: false,
        createdAt: "",
      };
    }
  ),

  deactivate: unary("Deactivate", async (req: { userId: string }) => {
    const result = await deactivateAccount(req.userId);
    return { success: result.success, message: "" };
  }),
};

export const startGrpcServer = (port: string | number): Promise<grpc.Server> => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;

  const server = new grpc.Server();
  server.addService(proto.auth.AuthService.service, service);

  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          reject(err);
          return;
        }
        logger.info(`✓ gRPC server listening on port ${boundPort}`);
        resolve(server);
      }
    );
  });
};
