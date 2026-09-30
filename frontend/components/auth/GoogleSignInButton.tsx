"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
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
  disabled = false,
}: {
  onCredential: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const scriptId = "google-identity-services";
    const initialize = () => {
      const container = containerRef.current;
      if (!window.google || !container) return;
      container.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          void credentialHandlerRef.current(credential);
        },
      });
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(400, Math.max(240, Math.floor(container.getBoundingClientRect().width))),
      });
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.google) initialize();
      else existing.addEventListener("load", initialize, { once: true });
      return () => existing.removeEventListener("load", initialize);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initialize, { once: true });
    document.body.appendChild(script);
    return () => script.removeEventListener("load", initialize);
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      className="google-signin-shell"
      aria-busy={disabled}
      style={disabled ? { pointerEvents: "none", opacity: 0.62 } : undefined}
    >
      <div ref={containerRef} className="google-signin-button" />
    </div>
  );
}
