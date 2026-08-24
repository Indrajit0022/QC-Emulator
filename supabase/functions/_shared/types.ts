// Shared types between the worker Edge Function and (mirrored) the frontend.

export type CallType = "kickoff" | "coaching";

export type ProcessingStage =
  | "created"
  | "loading_rubric"
  | "processing_transcript"
  | "extracting_evidence"
  | "scoring_dimensions"
  | "applying_rules"
  | "building_report"
  | "completed";

export type RunStatus = "queued" | "processing" | "completed" | "failed";

export interface RunRow {
  id: string;
  call_type: CallType;
  status: RunStatus;
  processing_stage: ProcessingStage;
  transcript: string;
  model: string | null;
  total_score: number | null;
  max_score: number | null;
  grade: string | null;
  report: FinalReport | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

export interface TranscriptTurn {
  speaker: string;
  text: string;
}

export interface EvidenceItem {
  speaker: string;
  quote: string;
  valid?: boolean; // filled in during evidence validation
}

// What the model returns for one dimension, before deterministic rules are applied.
export interface RawDimensionResult {
  key: string;
  score: number;
  reasoning: string;
  evidence: EvidenceItem[];
  quick_fix: string;
  applicable: boolean;
  // Present only for dimensions that define a `dimension_cap`. The model
  // reports whether the cap's condition held; the engine decides what that
  // does to the score.
  cap_flag?: GlobalFlagResult;
}

// After evidence validation + rubric caps are applied.
export interface FinalDimensionResult extends RawDimensionResult {
  max_score: number;
  name: string;
  capped_from?: number; // present if a rubric cap reduced the model's score
}

export interface FinalReport {
  one_thing: {
    text: string;
    score_without: number;
    score_with_estimate: number;
  };
  brief: string;
  red_flags: string[];
  evidence_coverage: string; // e.g. "9/12"
  caps_applied: string[]; // human-readable record of which global caps fired, per rubric instructions
}

// -----------------------------------------------------------------------
// Rubric config — the structured, code-usable form of the two rubric .md
// files. Generate these once you have kickoff-call-rubric.md /
// coaching-call-rubric.md (see rubrics/README.md).
// -----------------------------------------------------------------------
export interface RubricDimension {
  key: string;
  name: string;
  max_score: number;
  description: string; // what the model should look for, fed into the prompt
  // Optional dimensions (e.g. coaching D4 "movement coaching" — not every
  // call has movement coaching) can be marked inapplicable by the model.
  // When redistributable=true, an inapplicable dimension's points are
  // excluded from BOTH numerator and denominator (score becomes "out of
  // max_score minus this dimension") rather than scored 0 — matches rubric
  // language like "redistribute weight, do not penalize the coach."
  // MVP simplification: points are excluded, not literally redistributed
  // to other named dimensions (the rubric doesn't specify exact weights).
  redistributable?: boolean;
  // A hard rule the rubric states for THIS dimension (e.g. "no North Star
  // statement → max 10/15"). Same shape as GlobalCap but scoped to one
  // dimension's score rather than the run total. The model only reports
  // whether the condition held; rubric-engine.ts applies the cap.
  dimension_cap?: DimensionCap;
  // The discrete scores this dimension is allowed to take. The coaching
  // rubric states exact buckets and forbids interpolation; the kickoff
  // rubric is band-based with half-steps, so it leaves this unset.
  buckets?: number[];
}

export interface DimensionCap {
  flag_key: string; // the key the model returns in the dimension's cap_flag
  prompt_description: string; // condition text, fed into the prompt
  cap_value: number; // this dimension's score cannot exceed this when flagged
}

// A cap that applies to the RUN TOTAL based on a call-wide condition that
// isn't reducible to a single dimension's score (e.g. "coach speaks >70% of
// the call" or "no follow-up questions anywhere"). The model reports
// whether each condition held (see GlobalFlagResult); the deterministic
// engine — not the model — decides whether/how to apply the cap.
export interface GlobalCap {
  key: string; // must match the key the model returns in global_flags
  prompt_description: string; // fed into the prompt so the model knows what to detect
  cap_value: number; // PERCENTAGE (0-100) the final normalized score cannot exceed if the flag is true
}

export interface GlobalFlagResult {
  key: string;
  present: boolean;
  reasoning: string;
}

export interface GradeBand {
  min: number; // inclusive, PERCENTAGE (0-100) — final scores are always normalized to /100, see rubric-engine.ts
  max: number; // inclusive, PERCENTAGE (0-100)
  grade: string;
}

export interface RubricConfig {
  call_type: CallType;
  scoring_notes: string; // call-type-level scoring philosophy/instructions injected into the prompt
  dimensions: RubricDimension[];
  global_caps: GlobalCap[];
  max_score: number; // sum of all (non-redistributable) dimension max_scores — informational; run totals are normalized to /100 regardless (see rubric-engine.ts)
  grade_bands: GradeBand[];
}
