// BharatSource — Socket.IO client helper.
// Socket.IO lives in the Express process (:4000), NOT behind the Next /api proxy,
// so the client connects to the backend origin directly. Configure via
// NEXT_PUBLIC_SOCKET_URL; defaults to the current page origin.

import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;

function socketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/**
 * Returns a shared Socket.IO connection authenticated with the current JWT.
 * Lazily created; reused across calls. Safe to call in the browser only.
 */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(socketUrl(), {
    autoConnect: true,
    transports: ["websocket", "polling"],
    auth: { token: getToken() || undefined },
  });

  return socket;
}

/** Force a fresh connection (e.g. after login/logout swaps the token). */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
