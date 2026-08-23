import type {
  FinalDimensionResult,
  GlobalFlagResult,
  RawDimensionResult,
  RubricConfig,
} from "./types.ts";

export interface RubricRulesResult {
  dimensions: FinalDimensionResult[];
  totalScore: number; // normalized to a /100 scale (see note below)
  maxScore: number; // always 100 — see note below
  grade: string;
  capsApplied: string[];
}

// ---------------------------------------------------------------------------
// Why everything is normalized to /100:
//
// The coaching rubric's own principle #6 says: "When D4 is disabled the call
// is scored out of 85, not 100. The percentage is the raw score over 85.
// Report the result on the 100 scale." That instruction — score a
// percentage against whatever the achievable total is, then report on /100
// — turns out to be exactly the right general mechanism for two problems at
// once:
//   1. D4 (Movement Coaching) is optional and shifts the achievable total
//      (100 vs 85 per the rubric's own text).
//   2. The individual dimension point values as documented in both rubric
//      files sum to 105 (coaching) and 100 (kickoff), not the "100 points"
//      the docs state as the headline total for coaching — a small
//      inconsistency in the source rubric. Rather than silently guess which
//      dimension's stated point value is wrong, this computes a percentage
//      of whatever the real achievable total is (whether that's 105, 90, or
//      100) and reports THAT percentage on a normalized /100 scale — which
//      is consistent with the rubric's own instruction and sidesteps the
//      discrepancy rather than papering over it. Per-dimension scores
//      (e.g. "7/10" on a single dimension) are UNCHANGED — only the run-level
//      total/grade are normalized.
//
// Global caps are therefore expressed as a PERCENTAGE cap (0-100), not raw
// points, for the same reason: a percentage cap behaves correctly whether
// D4 was active or not.
// ---------------------------------------------------------------------------
export function applyRubricRules(
  raw: RawDimensionResult[],
  globalFlags: GlobalFlagResult[],
  rubric: RubricConfig,
): RubricRulesResult {
  const byKey = new Map(raw.map((d) => [d.key, d]));

  const finalDimensions: FinalDimensionResult[] = rubric.dimensions.map(
    (rd) => {
      const model = byKey.get(rd.key);
      if (!model) {
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

  // Redistributable dimensions marked inapplicable are excluded from both
  // numerator and denominator (MVP simplification of "redistribute weight" —
  // see RubricDimension.redistributable in types.ts).
  let achievableMax = 0;
  let rawTotal = 0;
  for (const rubricDef of rubric.dimensions) {
    const d = finalDimensions.find((f) => f.key === rubricDef.key)!;
    if (rubricDef.redistributable && !d.applicable) continue;
    achievableMax += rubricDef.max_score;
    rawTotal += d.score;
  }

  let percentage = achievableMax > 0 ? (rawTotal / achievableMax) * 100 : 0;

  const capsApplied: string[] = [];
  const flagByKey = new Map(globalFlags.map((f) => [f.key, f]));
  for (const cap of rubric.global_caps) {
    const flag = flagByKey.get(cap.key);
    if (flag?.present && percentage > cap.cap_value) {
      percentage = cap.cap_value;
      capsApplied.push(`${cap.key}: ${flag.reasoning}`);
    }
  }

  const totalScore = Math.round(percentage);
  const grade =
    rubric.grade_bands.find((b) => totalScore >= b.min && totalScore <= b.max)
      ?.grade ?? "Unscored";

  return { dimensions: finalDimensions, totalScore, maxScore: 100, grade, capsApplied };
}

export function evidenceCoverage(dimensions: { evidence: unknown[] }[]): string {
  const withEvidence = dimensions.filter((d) => d.evidence.length > 0).length;
  return `${withEvidence}/${dimensions.length}`;
}
