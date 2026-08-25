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

export interface EvidenceItem {
  speaker: string;
  quote: string;
  valid?: boolean;
}

export interface DimensionRow {
  id: string;
  run_id: string;
  dimension_key: string;
  dimension_name: string;
  score: number | null;
  max_score: number;
  reasoning: string | null;
  evidence: EvidenceItem[];
  quick_fix: string | null;
  is_applicable: boolean;
}

export interface FinalReport {
  one_thing: { text: string; score_without: number; score_with_estimate: number };
  brief: string;
  red_flags: string[];
  evidence_coverage: string;
  caps_applied: string[];
}

export interface RunRow {
  id: string;
  call_type: CallType;
  status: RunStatus;
  processing_stage: ProcessingStage;
  transcript: string;
  total_score: number | null;
  max_score: number | null;
  grade: string | null;
  report: FinalReport | null;
  error: string | null;
  created_at: string;
}

export const STAGE_LABELS: Record<ProcessingStage, string> = {
  created: "Transcript received",
  loading_rubric: "Rubric loaded",
  processing_transcript: "Transcript parsed",
  extracting_evidence: "Evidence extracted",
  scoring_dimensions: "Scoring dimensions",
  applying_rules: "Applying rubric rules",
  building_report: "Building report",
  completed: "Complete",
};

export const STAGE_ORDER: ProcessingStage[] = [
  "created",
  "loading_rubric",
  "processing_transcript",
  "extracting_evidence",
  "scoring_dimensions",
  "applying_rules",
  "building_report",
  "completed",
];
