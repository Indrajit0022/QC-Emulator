import type { Config } from "tailwindcss";

// Design tokens for the Call Evaluation System.
// Signature idea: the product's core mechanic is "every score must trace
// back to a literal quote," so evidence quotes are rendered in a monospace
// face with a highlighter-yellow underline throughout the UI — the visual
// language IS the evidence-first principle, not decoration on top of it.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF9", // background — cool, not warm cream
        ink: "#1C2331", // primary text
        muted: "#6B7280", // secondary text
        line: "#E5E7EB", // borders/dividers
        highlight: "#FFD84D", // evidence-quote accent, used sparingly
        strong: "#2F6F4F", // strong grade / success
        weak: "#B3441E", // red flags / failed state
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
