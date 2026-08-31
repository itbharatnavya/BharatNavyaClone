import type { Config } from "tailwindcss";

/**
 * BharatSource — light design system tokens.
 * White canvas, generous whitespace, one trust accent (blue) + one action
 * accent (warm orange), hairline borders, soft shadows.
 * NO dark theme. Semantic color names extend Tailwind defaults (so gray/white/
 * transparent etc. remain available).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1200px",
      },
    },
    extend: {
      // Custom breakpoint for the navbar desktop/mobile switch (~900px).
      screens: {
        nav: "900px",
      },
      colors: {
        // ---- Canvas / surfaces ----
        canvas: "#FFFFFF",
        "bg-subtle": "#F7F8FA",
        surface: "#FFFFFF",

        // ---- Ink / text ----
        ink: "#0F172A",
        muted: "#475569",
        faint: "#94A3B8",

        // ---- Borders (Tailwind's default border-color also resolves to gray-200 = #E5E7EB) ----
        border: "#E5E7EB",
        "border-strong": "#CBD5E1",

        // ---- Trust accent (blue) ----
        brand: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          tint: "#EFF6FF",
        },

        // ---- Action accent (warm orange) ----
        action: {
          DEFAULT: "#F97316",
          hover: "#EA580C",
          tint: "#FFF7ED",
        },

        // ---- Status ----
        success: "#16A34A",
        warn: "#D97706",
        error: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        eyebrow: ["12px", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "0.08em" }],
        display: ["56px", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.02em" }],
        h1: ["40px", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" }],
        h2: ["30px", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
        h3: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
      },
      maxWidth: {
        container: "1200px",
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "6px",
        md: "8px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)",
        "card-hover":
          "0 4px 12px rgba(16,24,40,.08), 0 2px 6px rgba(16,24,40,.06)",
        pop: "0 8px 24px rgba(16,24,40,.12)",
        ring: "0 0 0 3px rgba(37,99,235,.15)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-320px 0" },
          "100%": { backgroundPosition: "320px 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite linear",
        "fade-in": "fade-in 160ms ease",
        "scale-in": "scale-in 180ms ease",
      },
    },
  },
  plugins: [],
};

export default config;
