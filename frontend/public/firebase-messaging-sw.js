// firebase-messaging-sw.js — background push handler (CHAT-PLAN.md Phase 10).
// Must live at the site root (not /some/path/) so its default scope covers the
// whole origin. A service worker can't read Next.js env vars — this Firebase
// web config is NOT secret by design (it identifies the project publicly;
// Firebase's actual security boundary is server-side rules/auth, not hiding
// these values), so hardcoding it here (and shipping it in NEXT_PUBLIC_* vars
// client-side) is the correct, standard approach — never put the service
// account key (the real secret) anywhere near the frontend.

importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCp3SyKzAjJ8fN3qB-kQB6qde8pB8ksZV8",
  authDomain: "bharatnavya-dev.firebaseapp.com",
  projectId: "bharatnavya-dev",
  storageBucket: "bharatnavya-dev.firebasestorage.app",
  messagingSenderId: "173736317107",
  appId: "1:173736317107:web:eb8913ea2736f24b6120c6",
});

const messaging = firebase.messaging();

// Background messages (tab/browser not focused, or fully closed) — the
// backend (backend/lib/fcm.js) always sends a `notification` payload plus a
// `data.link`; this handler owns the actual display so click-through opens
// the right chat thread instead of a generic browser default.
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const link = (payload.data && payload.data.link) || "/";
  self.registration.showNotification(notification.title || "New message", {
    body: notification.body || "",
    icon: "/favicon.ico",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const client of all) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
