import type { WebSocket } from "ws";
import { logger } from "../config/logger.js";

// A USER CAN HAVE MULTIPLE OPEN CONNECTIONS (MULTIPLE TABS/DEVICES) — HENCE Set, NOT A SINGLE SOCKET.
const connections = new Map<string, Set<WebSocket>>();

export const registerConnection = (userId: string, socket: WebSocket): void => {
  const sockets = connections.get(userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  connections.set(userId, sockets);
};

export const unregisterConnection = (userId: string, socket: WebSocket): void => {
  const sockets = connections.get(userId);
  if (!sockets) return;

  sockets.delete(socket);
  if (sockets.size === 0) connections.delete(userId);
};

// NO-OP IF THE USER HAS NO OPEN CONNECTION — THAT'S THE NORMAL "OFFLINE" CASE, NOT AN ERROR.
export const pushToUser = (userId: string, payload: unknown): void => {
  const sockets = connections.get(userId);
  if (!sockets || sockets.size === 0) return;

  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState !== socket.OPEN) continue;
    try {
      socket.send(message);
    } catch (err) {
      logger.error({ err, userId }, "Failed to push message to socket");
    }
  }
};

// DISTINCT USERS WITH AT LEAST ONE OPEN CONNECTION — NOT THE SAME AS THE TOTAL NUMBER OF OPEN
// SOCKETS (SEE socketCount BELOW). A USER WITH 10 TABS OPEN COUNTS AS 1 HERE.
export const connectionCount = (): number => connections.size;

// TOTAL OPEN SOCKETS ACROSS ALL USERS — THE ACTUAL WEBSOCKET LOAD FIGURE FOR CAPACITY/MONITORING
// PURPOSES. connectionCount() ALONE UNDERCOUNTS THIS WHENEVER A USER HAS MULTIPLE TABS/DEVICES
// CONNECTED AT ONCE, SINCE IT ONLY COUNTS DISTINCT USERS, NOT SOCKETS.
export const socketCount = (): number => {
  let total = 0;
  for (const sockets of connections.values()) total += sockets.size;
  return total;
};
