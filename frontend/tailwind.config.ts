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
        canvas: "var(--canvas)",
        "bg-subtle": "var(--bg-subtle)",
        surface: "var(--surface)",

        // ---- Ink / text ----
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",

        // ---- Borders (Tailwind's default border-color also resolves to gray-200 = #E5E7EB) ----
        border: "var(--border)",
        "border-strong": "var(--border-strong)",

        // ---- Trust accent (blue) ----
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          tint: "var(--brand-tint)",
        },

        // ---- Action accent (warm orange) ----
        action: {
          DEFAULT: "var(--action)",
          hover: "var(--action-hover)",
          tint: "var(--action-tint)",
        },

        // ---- Status ----
        success: "var(--success)",
        warn: "var(--warn)",
        error: "var(--error)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.875rem", { lineHeight: "1.45" }],
        base: ["1rem", { lineHeight: "1.55" }],
        lg: ["1.125rem", { lineHeight: "1.4" }],
        xl: ["1.375rem", { lineHeight: "1.3" }],
        "2xl": ["clamp(1.5rem, 2.6vw, 2rem)", { lineHeight: "1.2" }],
        "3xl": ["clamp(1.9rem, 4vw, 3.25rem)", { lineHeight: "1.1" }],
        eyebrow: ["0.75rem", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "0.08em" }],
        display: ["clamp(1.9rem, 4vw, 3.25rem)", { lineHeight: "1.08", fontWeight: "700", letterSpacing: "-0.02em" }],
        h1: ["clamp(1.9rem, 4vw, 3.25rem)", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" }],
        h2: ["clamp(1.5rem, 2.6vw, 2rem)", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
        h3: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
      },
      maxWidth: {
        container: "1200px",
      },
      borderRadius: {
        DEFAULT: "var(--r-sm)",
        sm: "var(--r-xs)",
        md: "var(--r-xs)",
        lg: "var(--r-md)",
        xl: "var(--r-lg)",
        "2xl": "var(--r-lg)",
        "3xl": "var(--r-lg)",
        pill: "var(--r-pill)",
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
