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
  cap?: {
    // optional deterministic cap: "if dimension X scores <= threshold,
    // total score cannot exceed capValue"
    condition: "dimension_at_or_below";
    dimensionKey: string;
    threshold: number;
    capValue: number;
  };
}

export interface GradeBand {
  min: number; // inclusive, as a fraction 0-1 of max_score, or absolute — pick one and be consistent
  max: number;
  grade: string;
}

export interface RubricConfig {
  call_type: CallType;
  dimensions: RubricDimension[];
  max_score: number; // sum of all dimension max_scores
  grade_bands: GradeBand[];
}
