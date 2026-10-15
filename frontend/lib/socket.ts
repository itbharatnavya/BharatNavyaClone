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
    // Function form: socket.io re-reads the token on every (re)connect, so it never replays an old login.
    auth: (cb) => cb({ token: getToken() || undefined }),
  });

  return socket;
}

/**
 * Re-authenticate the shared socket after the login changes (login, logout, switching account).
 * The socket is a singleton that lives across the whole session, so without this it stays signed in as
 * the previous user and the server saves new messages under that user. Keeps the same Socket object so
 * the listeners other components attached stay in place; chat threads re-join their room on reconnect.
 */
export function syncSocketAuth(): void {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
}

/** Force a fresh connection (e.g. after login/logout swaps the token). */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
