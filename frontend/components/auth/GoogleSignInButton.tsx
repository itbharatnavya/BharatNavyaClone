"use client";

// Renders Google's own "Continue with Google" button (G logo + text — the same
// rendered widget every other app uses, via Google Identity Services) and hands
// the verified credential JWT up to the caller. The caller decides what to do
// with it (login page calls useAuth().loginWithGoogle — backend auto-registers
// on first sign-in, no separate "register with Google" path needed).

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) return;

    const scriptId = "google-identity-services";
    function init() {
      if (!window.google || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => {
          void onCredential(resp.credential);
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 360,
      });
    }

    if (document.getElementById(scriptId)) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [onCredential, disabled]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />;
}
