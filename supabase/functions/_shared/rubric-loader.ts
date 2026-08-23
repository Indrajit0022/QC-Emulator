import type { CallType, RubricConfig } from "./types.ts";
import kickoffRubric from "./rubrics/kickoff.rubric.json" with { type: "json" };
import coachingRubric from "./rubrics/coaching.rubric.json" with { type: "json" };

// Rubric content lives server-side only (bundled into the Edge Function),
// never shipped to the frontend and never hardcoded into scoring logic on
// the client — satisfies PRD §10 ("do not hardcode scoring logic into the
// frontend").
export function loadRubric(callType: CallType): RubricConfig {
  const rubric = callType === "kickoff" ? kickoffRubric : coachingRubric;
  return rubric as unknown as RubricConfig;
}
