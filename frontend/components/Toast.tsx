"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type ToastType = "success" | "error" | "info" | "chat";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ACCENT: Record<ToastType, string> = {
  success: "var(--counter-success, #16834f)",
  error: "var(--counter-error, #b42318)",
  info: "var(--counter-indigo, #1b3fa0)",
  chat: "var(--brand, #2563EB)",
};

const ICON: Record<ToastType, string> = {
  success: "M20 6L9 17l-5-5",
  error: "M18 6L6 18M6 6l12 12",
  info: "M12 16v-4M12 8h.01",
  chat: "M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.7 8.7 0 0 1-4-.9L3 20l1-3.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 11.5 4h.5A8.4 8.4 0 0 1 21 11.5Z",
};

let counter = 0;
const LIFETIME = 3200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

      window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        );
      }, LIFETIME - 200);

      window.setTimeout(() => removeToast(id), LIFETIME);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bn-toast bn-toast-${t.type} ${t.exiting ? "toast-exit" : "toast-enter"}`}
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: 340,
              maxWidth: "calc(100vw - 40px)",
              padding: "13px 16px",
              fontSize: "var(--fs-sm)",
              lineHeight: 1.4,
              pointerEvents: "auto",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACCENT[t.type]}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              {t.type === "info" && <circle cx="12" cy="12" r="9" />}
              <path d={ICON[t.type]} />
            </svg>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
