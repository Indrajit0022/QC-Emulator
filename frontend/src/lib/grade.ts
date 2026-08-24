// Maps a grade string to its color tokens. Grade colors are reserved
// strictly for grade-band meaning — never reused decoratively elsewhere in
// the UI (see tailwind.config.ts comment on `strong`/`weak`).
export function gradeTokens(grade: string | null): {
  text: string;
  bg: string;
  dot: string;
} {
  switch (grade) {
    case "Elite":
    case "Strong":
      return { text: "text-strong-text", bg: "bg-strong-bg", dot: "bg-strong" };
    case "Inconsistent":
      return { text: "text-muted", bg: "bg-line/40", dot: "bg-muted" };
    case "At Risk":
    case "Fail":
      return { text: "text-weak-text", bg: "bg-weak-bg", dot: "bg-weak" };
    default:
      return { text: "text-muted", bg: "bg-line/40", dot: "bg-muted" };
  }
}
