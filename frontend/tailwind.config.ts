import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light mode tokens
        paper: "#FAFAF9",
        card: "#FFFFFF",
        ink: "#1C2331",
        muted: "#6B7280",
        line: "#E5E7EB",
        coral: "#E24B4A",
        "coral-bg": "#FCEBEB",
        "coral-text": "#791F1F",
        strong: "#639922",
        "strong-bg": "#EAF3DE",
        "strong-text": "#173404",
        weak: "#E24B4A",
        "weak-bg": "#FCEBEB",
        "weak-text": "#501313",

        // Dark mode tokens (used with dark: prefix)
        dark: {
          paper: "#0B0D14",
          card: "#12151E",
          surface: "#1A1E2E",
          ink: "#F0F2F8",
          muted: "#8B93A7",
          line: "#1E2235",
          "coral-bg": "#2D1515",
          "coral-text": "#F87171",
          "strong-bg": "#142310",
          "strong-text": "#86EFAC",
          "weak-bg": "#2D1515",
          "weak-text": "#FCA5A5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.03)",
        "glass-lg": "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 32px -8px rgba(0,0,0,0.12)",
        glow: "0 0 20px -4px rgba(226,75,74,0.25)",
        "glow-strong": "0 0 24px -4px rgba(99,153,34,0.3)",
      },
      transitionDuration: {
        "250": "250ms",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out both",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
