import type { Config } from "tailwindcss";

// Design tokens for the Call Evaluation System, v2.
// Signature idea unchanged: the product's core mechanic is "every score
// must trace back to a literal quote," so evidence quotes carry the accent
// color throughout the UI. Accent moved from a yellow highlighter to coral
// (dial/stat-card reference), grade colors (strong/weak) are reserved
// strictly for grade-band meaning, never used decoratively elsewhere.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF9", // page background
        card: "#FFFFFF", // raised card surface
        ink: "#1C2331", // primary text
        muted: "#6B7280", // secondary text
        line: "#E5E7EB", // borders/dividers, unfilled gauge ticks
        coral: "#E24B4A", // single UI accent — evidence quotes, gauge fill, focus rings
        "coral-bg": "#FCEBEB", // coral tint for pills/badges
        "coral-text": "#791F1F", // text-on-coral-bg (contrast-safe)
        strong: "#639922", // grade-band meaning only: Elite/Strong
        "strong-bg": "#EAF3DE",
        "strong-text": "#173404",
        weak: "#E24B4A", // grade-band meaning only: Fail/At Risk (shares coral hue on purpose)
        "weak-bg": "#FCEBEB",
        "weak-text": "#501313",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
} satisfies Config;
