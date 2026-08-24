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

// Nearest allowed bucket. Ties go to the LOWER bucket, matching the rubric's
// instruction to score conservatively when the evidence is borderline.
function snapToBucket(score: number, buckets: number[]): number {
  return [...buckets]
    .sort((a, b) => a - b)
    .reduce((best, b) =>
      Math.abs(b - score) < Math.abs(best - score) ? b : best
    );
}

export function applyRubricRules(
  raw: RawDimensionResult[],
  globalFlags: GlobalFlagResult[],
  rubric: RubricConfig,
): RubricRulesResult {
  const byKey = new Map(raw.map((d) => [d.key, d]));
  const dimensionCapsApplied: string[] = [];

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

      // The rubric states some caps as hard rules for a single dimension
      // ("no North Star statement → max 10/15"). The model only tells us
      // whether the condition held; the decision is made here.
      let score = clampedScore;
      let cappedFrom: number | undefined;
      const cap = rd.dimension_cap;
      const capFired = cap !== undefined &&
        model.cap_flag?.key === cap.flag_key &&
        model.cap_flag.present === true;

      if (cap && capFired && score > cap.cap_value) {
        cappedFrom = score;
        score = cap.cap_value;
        dimensionCapsApplied.push(
          `${rd.name}: capped to ${cap.cap_value}/${rd.max_score} (from ${cappedFrom}) — ` +
            `${model.cap_flag?.reasoning?.trim() || cap.prompt_description}`,
        );
      }

      // Discrete-bucket rubrics (coaching) forbid interpolation, so the
      // model's raw number is snapped onto an allowed value.
      if (rd.buckets && rd.buckets.length > 0) {
        const snapped = snapToBucket(score, rd.buckets);
        // A snap must never undo a cap: if rounding would land above the
        // cap, take the highest allowed bucket at or below it instead.
        if (cap && capFired && snapped > cap.cap_value) {
          const atOrBelow = rd.buckets.filter((b) => b <= cap.cap_value);
          score = atOrBelow.length ? Math.max(...atOrBelow) : cap.cap_value;
        } else {
          score = snapped;
        }
      }

      return {
        key: rd.key,
        name: rd.name,
        max_score: rd.max_score,
        score,
        reasoning: model.reasoning,
        evidence: model.evidence,
        quick_fix: model.quick_fix,
        applicable: model.applicable,
        ...(cappedFrom !== undefined ? { capped_from: cappedFrom } : {}),
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

  // Per-dimension caps are reported alongside the run-total ones so neither
  // kind is silent in the final report.
  const capsApplied: string[] = [...dimensionCapsApplied];
  const flagByKey = new Map(globalFlags.map((f) => [f.key, f]));
  for (const cap of rubric.global_caps) {
    const flag = flagByKey.get(cap.key);
    if (flag?.present && percentage > cap.cap_value) {
      const before = Math.round(percentage);
      percentage = cap.cap_value;
      capsApplied.push(
        `Overall score: capped to ${cap.cap_value}/100 (from ${before}) — ` +
          `${flag.reasoning?.trim() || cap.prompt_description}`,
      );
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
