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
          paper: "#0F1117",
          card: "#1A1D27",
          surface: "#222638",
          ink: "#F0F2F8",
          muted: "#8B93A7",
          line: "#2D3148",
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
        card: "12px",
      },
      transitionDuration: {
        "250": "250ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
