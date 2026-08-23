import type {
  FinalDimensionResult,
  RawDimensionResult,
  RubricConfig,
} from "./types.ts";

export interface RubricRulesResult {
  dimensions: FinalDimensionResult[];
  totalScore: number;
  maxScore: number;
  grade: string;
}

// PRD §15: "The model provides its dimension-level assessment. The
// application then applies deterministic rubric rules and automatic caps."
// This function is pure and has zero dependency on the LLM — it's the piece
// that makes the score reproducible and auditable, not a black box.
export function applyRubricRules(
  raw: RawDimensionResult[],
  rubric: RubricConfig,
): RubricRulesResult {
  const byKey = new Map(raw.map((d) => [d.key, d]));

  const finalDimensions: FinalDimensionResult[] = rubric.dimensions.map(
    (rd) => {
      const model = byKey.get(rd.key);
      if (!model) {
        // Model omitted a dimension entirely — treat as inapplicable/0 rather
        // than silently dropping it, so the report always has all 12 rows.
        return {
          key: rd.key,
          name: rd.name,
          max_score: rd.max_score,
          score: 0,
          reasoning: "Model did not return a result for this dimension.",
          evidence: [],
          quick_fix: "",
          applicable: false,
        };
      }
      // Clamp into the valid range regardless of what the model claimed.
      const clampedScore = Math.max(0, Math.min(rd.max_score, model.score));
      return {
        key: rd.key,
        name: rd.name,
        max_score: rd.max_score,
        score: clampedScore,
        reasoning: model.reasoning,
        evidence: model.evidence,
        quick_fix: model.quick_fix,
        applicable: model.applicable,
      };
    },
  );

  let totalScore = finalDimensions.reduce((sum, d) => sum + d.score, 0);
  const maxScore = rubric.max_score;

  // Apply any per-dimension caps defined in the rubric config
  // (see RubricDimension.cap in types.ts). Example real-world rule this
  // supports: "if Goal Clarity scores <= 3, total cannot exceed 60/100."
  for (const rd of rubric.dimensions) {
    if (!rd.cap) continue;
    const trigger = finalDimensions.find((d) => d.key === rd.cap!.dimensionKey);
    if (trigger && trigger.score <= rd.cap.threshold && totalScore > rd.cap.capValue) {
      const capped = finalDimensions.find((d) => d.key === rd.key);
      if (capped) capped.capped_from = totalScore;
      totalScore = rd.cap.capValue;
    }
  }

  const grade =
    rubric.grade_bands.find((b) => totalScore >= b.min && totalScore <= b.max)
      ?.grade ?? "Unscored";

  return { dimensions: finalDimensions, totalScore, maxScore, grade };
}

export function evidenceCoverage(dimensions: FinalDimensionResult[]): string {
  const withEvidence = dimensions.filter((d) => d.evidence.length > 0).length;
  return `${withEvidence}/${dimensions.length}`;
}
