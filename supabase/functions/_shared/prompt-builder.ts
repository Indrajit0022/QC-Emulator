import type { FinalDimensionResult, RubricConfig, TranscriptTurn } from "./types.ts";
import { turnsToText } from "./transcript-parser.ts";

// ---------------------------------------------------------------------------
// Design note: scoring is split into groups of dimensions rather than one
// call for all 12. Two constraints push in opposite directions here:
//
//   - OpenRouter's free tier is rate-limited (50 req/day, 20/min), which
//     argues for as few calls as possible.
//   - A Supabase Edge Function gets ~150s of wall clock, and producing all 12
//     dimensions of reasoning + evidence in one response reliably blew past
//     that — the invocation was killed mid-flight, which is worse than slow.
//
// The compromise: a handful of dimensions per call, driven by the worker's
// resumable scoring stage (see DIMENSIONS_PER_CALL in process-run). Global
// flags and the report-level fields are call-wide, so they ride along with
// the first group only.
// ---------------------------------------------------------------------------

export function buildResponseSchema(
  rubric: RubricConfig,
  includeGlobalFlags: boolean,
) {
  return {
    type: "object",
    properties: {
      dimensions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", description: "must exactly match one of the provided dimension keys" },
            applicable: {
              type: "boolean",
              description:
                "false only if this dimension's behaviour is genuinely out of scope for this call (see each dimension's applicability note) — not merely 'poorly executed'",
            },
            score: {
              type: "number",
              description: rubric.scoring_notes.includes("Discrete")
                ? "must be exactly one of the bucket values listed for this dimension — no interpolation"
                : "must fall within one of the bands listed for this dimension",
            },
            reasoning: { type: "string" },
            evidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  speaker: { type: "string" },
                  quote: {
                    type: "string",
                    description: "must be copied VERBATIM from the transcript, word for word",
                  },
                },
                required: ["speaker", "quote"],
              },
            },
            quick_fix: { type: "string" },
          },
          required: ["key", "applicable", "score", "reasoning", "evidence", "quick_fix"],
        },
      },
      global_flags: {
        type: "array",
        description:
          "One entry for EVERY global condition listed under 'GLOBAL CONDITIONS TO CHECK' — report whether each condition held, regardless of whether it changes the outcome.",
        items: {
          type: "object",
          properties: {
            key: { type: "string", description: "must exactly match one of the provided global cap keys" },
            present: { type: "boolean" },
            reasoning: { type: "string" },
          },
          required: ["key", "present", "reasoning"],
        },
      },
    },
    required: includeGlobalFlags ? ["dimensions", "global_flags"] : ["dimensions"],
  } as const;
}

// The call-wide narrative is written in a separate pass, once every dimension
// has been scored. Asking for it alongside the first group produced "N/A" —
// correctly so, since the model could only see 4 of the 12 dimensions at that
// point and had no basis for a judgement about the call as a whole.
export const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    brief: {
      type: "string",
      description: "2-4 sentences written directly to the coach, in second person.",
    },
    red_flags: {
      type: "array",
      items: { type: "string" },
      description:
        "Specific behaviours or omissions that could put the client relationship at risk. Empty array if none. A good overall score must not hide a real red flag.",
    },
    one_thing: {
      type: "string",
      description:
        "The single change that would improve the score the most. Name the specific dimension and the concrete behaviour to change.",
    },
  },
  required: ["brief", "red_flags", "one_thing"],
} as const;

function baseSystemPrompt(rubric: RubricConfig): string {
  return `You are a rigorous call-evaluation engine for a coaching business. You score ${rubric.call_type} calls against a fixed rubric.

Non-negotiable rules:
1. EVIDENCE FIRST. For each dimension: find evidence in the transcript, evaluate that evidence, THEN assign a score. Never start from a score and back-fill evidence for it.
2. Every "quote" you return MUST be copied verbatim, word-for-word, from the transcript you are given. Do not paraphrase, summarize, correct grammar, or combine text from two different lines into one quote. A downstream system will reject any quote that is not found character-for-character in the transcript.
3. If a dimension's target behaviour is NOT present in the transcript, do not infer it from tone, mood, or general impression. Set the score to reflect its absence, leave evidence empty, and say plainly in "reasoning" that no transcript evidence was found — do not invent evidence to avoid an awkward low score.
4. If a dimension does not genuinely apply to this call (see its applicability note, if any), set "applicable": false and explain why; still return a score of 0 and empty evidence.
5. "quick_fix" is one concrete, actionable sentence the coach could apply on their very next call — not generic advice.
6. Score each dimension independently using ONLY that dimension's own band/bucket table. Do NOT apply the global caps yourself — a separate deterministic system does that from the "global_flags" you report. Just report, per flag, whether the underlying condition held and why.
7. Output must match the provided JSON schema exactly. No prose outside the JSON.

SCORING PHILOSOPHY FOR THIS RUBRIC:
${rubric.scoring_notes}`;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

export function buildEvaluationPrompt(
  rubric: RubricConfig,
  turns: TranscriptTurn[],
  // Only these dimensions are scored in this call. Scoring is split across
  // several cron ticks so no single Edge Function invocation has to produce
  // all 12 dimensions of output before its wall-clock limit (PRD §24: a
  // 65k-character transcript must not break the system).
  dimensionsToScore: RubricConfig["dimensions"],
  // Global flags are transcript-wide conditions, so they are asked for once,
  // with the first group (every group call sees the full transcript).
  includeGlobalFlags: boolean,
): BuiltPrompt {
  const transcriptText = turnsToText(turns);

  const dimensionsBlock = dimensionsToScore
    .map(
      (d, i) =>
        `${i + 1}. key: "${d.key}" | name: "${d.name}" | max_score: ${d.max_score}${
          d.redistributable ? " | OPTIONAL: mark applicable:false and score:0 if genuinely out of scope for this call — see description for the exact disable criteria" : ""
        }\n   ${d.description}`,
    )
    .join("\n\n");

  const globalCapsBlock = rubric.global_caps
    .map(
      (c, i) =>
        `${i + 1}. key: "${c.key}" — ${c.prompt_description} (if true, the final score is capped at ${c.cap_value}% — you do not apply the cap, just report whether the condition held)`,
    )
    .join("\n");

  const globalSection = includeGlobalFlags
    ? `\nGLOBAL CONDITIONS TO CHECK (report one flag per condition, regardless of outcome):\n${globalCapsBlock}\n`
    : "";

  const closing = includeGlobalFlags
    ? `Return your evaluation as JSON matching the required schema. Score all ${dimensionsToScore.length} dimensions listed above using each dimension's exact "key", and report all ${rubric.global_caps.length} global flags using each condition's exact "key".`
    : `Return your evaluation as JSON matching the required schema. Score ONLY the ${dimensionsToScore.length} dimensions listed above, using each dimension's exact "key". Do not include any other dimension.`;

  const user = `CALL TYPE: ${rubric.call_type}

RUBRIC DIMENSIONS (score every one of these ${dimensionsToScore.length} dimensions):
${dimensionsBlock}
${globalSection}
TRANSCRIPT (each line is "[Speaker]: text" — copy quotes exactly as they appear here):
"""
${transcriptText}
"""

${closing}`;

  return { system: baseSystemPrompt(rubric), user };
}

// Builds the closing narrative pass. It gets the finished scorecard rather
// than the transcript: by this point every judgement is already grounded in
// validated evidence, and re-sending a 65k-character transcript for a
// three-field summary would be wasteful.
export function buildSummaryPrompt(
  rubric: RubricConfig,
  dimensions: FinalDimensionResult[],
  totalScore: number,
  maxScore: number,
  grade: string,
  capsApplied: string[],
): BuiltPrompt {
  const scorecard = dimensions
    .map((d) => {
      const status = d.applicable ? `${d.score}/${d.max_score}` : "not applicable";
      const evidenceNote = d.evidence.length === 0
        ? " (no verified transcript evidence)"
        : ` (${d.evidence.length} verified quote${d.evidence.length === 1 ? "" : "s"})`;
      return `- ${d.name}: ${status}${evidenceNote}\n  ${d.reasoning}`;
    })
    .join("\n");

  const capsNote = capsApplied.length
    ? `\nAUTOMATIC RUBRIC CAPS THAT FIRED:\n${capsApplied.map((c) => `- ${c}`).join("\n")}\n`
    : "";

  const system =
    `You write the closing summary of a ${rubric.call_type} call evaluation, speaking directly to the coach who ran the call.

Rules:
1. Work only from the scorecard you are given. Do not invent behaviours or quotes that are not reflected in it.
2. "brief" is 2-4 sentences in second person ("you"), plain and specific — name what actually happened, not generic coaching advice.
3. "red_flags" lists behaviours or omissions that could put the client relationship at risk. A strong overall score does not excuse a real red flag. Return an empty array only if there genuinely are none.
4. "one_thing" names the single highest-leverage change, tied to a specific dimension and behaviour.
5. Output must match the provided JSON schema exactly. No prose outside the JSON.`;

  const user = `CALL TYPE: ${rubric.call_type}
FINAL SCORE: ${totalScore}/${maxScore} (${grade})
${capsNote}
SCORECARD (each dimension, its score, and the reasoning behind it):
${scorecard}

Write the brief, the red flags, and the one thing.`;

  return { system, user };
}
