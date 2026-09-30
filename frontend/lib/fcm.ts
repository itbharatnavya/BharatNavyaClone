"use client";

// lib/fcm.ts — FCM (Firebase Cloud Messaging) web-push registration
// (CHAT-PLAN.md Phase 10). Delivers a "new_message" push even when the
// tab/browser is closed — Socket.IO (lib/socket.ts) only reaches an open tab.
//
// None of the config below is secret (Firebase web config + VAPID key are
// meant to ship in client JS by design — also hardcoded in
// public/firebase-messaging-sw.js, which can't read env vars). The real
// secret, the service account JSON, lives only in backend/private/
// (gitignored) and this file never touches it.
//
// Silent no-op whenever: SSR, unconfigured (no NEXT_PUBLIC_FIREBASE_API_KEY),
// unsupported browser, or the user has denied/not granted notification
// permission — push is a nice-to-have, never something that should break the
// app or throw into a caller that isn't expecting it.

import { registerFcmToken as apiRegisterFcmToken } from "./api";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let inFlight: Promise<void> | null = null;

/**
 * Requests notification permission (if not already decided) and registers
 * this browser's FCM token with the backend. Call once per session, after
 * login — NotificationBell.tsx does this on mount since it's only rendered
 * when a user is signed in.
 *
 * Every early-out and failure is logged via console.warn/error prefixed
 * "[fcm]" — push staying silent to the END USER is intentional (never break
 * the app over a notification feature), but staying silent to whoever is
 * DEBUGGING it is not, so open devtools → Console and look for "[fcm]" if
 * push isn't arriving.
 */
export async function registerPushToken(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = run();
  return inFlight;
}

async function run(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!firebaseConfig.apiKey) {
    console.warn("[fcm] skipped — NEXT_PUBLIC_FIREBASE_API_KEY not set (check frontend/.env.local, and that the dev server was restarted after adding it)");
    return;
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("[fcm] skipped — this browser has no Notification/serviceWorker support");
    return;
  }

  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");

    if (!(await isSupported())) {
      console.warn("[fcm] skipped — firebase/messaging isSupported() returned false (private/incognito window, or a browser without Push API support, can cause this)");
      return;
    }

    if (Notification.permission === "denied") {
      console.warn("[fcm] skipped — Notification permission is denied for this origin (browser site settings, not something a code change can override)");
      return;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      console.info("[fcm] permission prompt result:", permission);
      if (permission !== "granted") return;
    } else {
      console.info("[fcm] permission already:", Notification.permission);
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.info("[fcm] service worker registered, scope:", swRegistration.scope);

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    if (!token) {
      console.warn("[fcm] getToken() returned no token — check NEXT_PUBLIC_FIREBASE_VAPID_KEY matches the Firebase project's Web Push certificate");
      return;
    }
    console.info("[fcm] got token, registering with backend:", token.slice(0, 12) + "…");

    await apiRegisterFcmToken(token);
    console.info("[fcm] registered with backend successfully");
  } catch (err) {
    console.error("[fcm] registration failed:", err);
  } finally {
    inFlight = null;
  }
}
