import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { DEFAULT_GRPC_SERVER_URL } from "../config/constants.js";
import { grpcClientDuration } from "../config/metrics.js";
import { fromGrpcError } from "./errorMapping.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// gateway/grpc/client.ts (OR COMPILED dist/grpc/client.js) -> ../../proto/auth.proto ->
// repo-root/proto — SAME RELATIVE-PATH REASONING AS server/grpc/server.ts, SAME DOCKERFILE
// LAYOUT REQUIREMENT (proto/ COPIED AS A SIBLING OF dist/, NOT NESTED UNDER IT).
const PROTO_PATH = path.resolve(__dirname, "../../proto/auth.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition) as any;

const serverUrl = process.env.GRPC_SERVER_URL || DEFAULT_GRPC_SERVER_URL;
const authClient = new proto.auth.AuthService(serverUrl, grpc.credentials.createInsecure());

// EXACT rpc NAMES FROM proto/auth.proto's AuthService — authClient[method] DISPATCHES BY THIS
// STRING WITH NO COMPILE-TIME LINK TO THE .proto FILE OTHERWISE, SO A TYPO OR A RENAMED RPC
// PREVIOUSLY ONLY FAILED AT RUNTIME (`authClient[method] is not a function`). TYPING method AS
// THIS UNION CATCHES THAT AT COMPILE TIME FOR EVERY CALL SITE IN gateway/controllers/.
export type AuthRpcMethod =
  | "Signup"
  | "VerifySignup"
  | "Login"
  | "ForgotPassword"
  | "VerifyOtp"
  | "ResetPassword"
  | "VerifyMfaLogin"
  | "ToggleMfa"
  | "VerifyMfaToggle"
  | "GetProfile"
  | "UpdateProfile"
  | "Deactivate";

// PROMISIFIES THE CALLBACK-STYLE @grpc/grpc-js CLIENT SO CONTROLLERS CAN await IT LIKE ANY
// OTHER ASYNC CALL. A gRPC FAILURE IS ALREADY TRANSLATED INTO AN AppError BY THE TIME IT
// REJECTS — CONTROLLERS NEVER NEED TO KNOW gRPC IS INVOLVED AT ALL.
export const callAuthService = <Req, Res>(method: AuthRpcMethod, request: Req): Promise<Res> =>
  new Promise((resolve, reject) => {
    const end = grpcClientDuration.startTimer({ method });
    authClient[method](request, (err: grpc.ServiceError | null, response: Res) => {
      if (err) {
        end({ status: grpc.status[err.code] ?? String(err.code) });
        reject(fromGrpcError(err));
      } else {
        end({ status: "OK" });
        resolve(response);
      }
    });
  });
