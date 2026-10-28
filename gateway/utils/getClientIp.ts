import type { Request } from "express";

// USES Express's trust-proxy-AWARE req.ip (gateway/index.ts SETS `trust proxy: 1`) RATHER THAN
// READING X-Forwarded-For DIRECTLY — A CLIENT CAN SET THAT HEADER TO ANYTHING IT WANTS, AND
// READING IT UNCHECKED (AS THIS FILE USED TO) LET ANY EXTERNAL REQUEST SPOOF THE IP RECORDED
// FOR LOGIN/MFA TRACKING. req.ip ONLY TRUSTS THE HEADER FOR THE NUMBER OF PROXY HOPS CONFIGURED.
export const getClientIp = (req: Request): string => req.ip || req.socket?.remoteAddress || "unknown";
