"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type ToastType = "success" | "error" | "info";

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
  success: "#16A34A",
  error: "#DC2626",
  info: "#2563EB",
};

const ICON: Record<ToastType, string> = {
  success: "M20 6L9 17l-5-5",
  error: "M18 6L6 18M6 6l12 12",
  info: "M12 16v-4M12 8h.01",
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
            className={t.exiting ? "toast-exit" : "toast-enter"}
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: 340,
              maxWidth: "calc(100vw - 40px)",
              background: "#ffffff",
              border: "1px solid #E5E7EB",
              borderLeft: `3px solid ${ACCENT[t.type]}`,
              padding: "13px 16px",
              borderRadius: 10,
              boxShadow:
                "0 8px 24px rgba(16,24,40,.12), 0 1px 3px rgba(16,24,40,.08)",
              fontSize: 14,
              lineHeight: 1.4,
              color: "#0F172A",
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
