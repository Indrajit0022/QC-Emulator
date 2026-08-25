export function gradeTokens(grade: string | null): {
  text: string;
  bg: string;
  dot: string;
} {
  switch (grade) {
    case "Elite":
    case "Strong":
      return {
        text: "text-strong-text dark:text-dark-strong-text",
        bg: "bg-strong-bg dark:bg-dark-strong-bg",
        dot: "bg-strong",
      };
    case "Inconsistent":
      return {
        text: "text-muted dark:text-dark-muted",
        bg: "bg-line/40 dark:bg-dark-line/40",
        dot: "bg-muted dark:bg-dark-muted",
      };
    case "At Risk":
    case "Fail":
      return {
        text: "text-weak-text dark:text-dark-weak-text",
        bg: "bg-weak-bg dark:bg-dark-weak-bg",
        dot: "bg-weak",
      };
    default:
      return {
        text: "text-muted dark:text-dark-muted",
        bg: "bg-line/40 dark:bg-dark-line/40",
        dot: "bg-muted dark:bg-dark-muted",
      };
  }
}
