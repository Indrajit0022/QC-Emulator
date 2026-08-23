import type { RubricConfig, TranscriptTurn } from "./types.ts";
import { turnsToText } from "./transcript-parser.ts";

// ---------------------------------------------------------------------------
// Design note: this is deliberately ONE call that scores all 12 dimensions
// AND drafts the report-level fields (brief / red flags / one-thing
// candidate) in a single structured response. That's a rate-limit decision,
// not a laziness shortcut: OpenRouter's free tier gives you 50 requests/day
// (20/min). Twelve separate per-dimension calls would burn a whole day's
// budget on four test transcripts. If a given free model can't reliably fill
// out all 12 dimensions in one shot, split DIMENSION_GROUPS below into two
// calls of 6 and merge the results — still just 2 calls/run.
// ---------------------------------------------------------------------------

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "must exactly match one of the provided dimension keys" },
          applicable: { type: "boolean" },
          score: { type: "number" },
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
    brief: {
      type: "string",
      description: "2-4 sentences written directly to the coach, in second person.",
    },
    red_flags: {
      type: "array",
      items: { type: "string" },
      description: "Specific behaviours or omissions that could put the client relationship at risk. Empty array if none.",
    },
    one_thing: {
      type: "string",
      description: "The single change that would improve the score the most. Name the specific dimension and behaviour.",
    },
  },
  required: ["dimensions", "brief", "red_flags", "one_thing"],
} as const;

const SYSTEM_PROMPT = `You are a rigorous call-evaluation engine for a coaching business. You score coaching calls against a fixed rubric.

Non-negotiable rules:
1. EVIDENCE FIRST. For each dimension: find evidence in the transcript, evaluate that evidence, THEN assign a score. Never start from a score and back-fill evidence for it.
2. Every "quote" you return MUST be copied verbatim, word-for-word, from the transcript you are given. Do not paraphrase, summarize, correct grammar, or combine text from two different lines into one quote. A downstream system will reject any quote that is not found character-for-character in the transcript.
3. If a dimension's target behaviour is NOT present in the transcript, do not infer it from tone, mood, or general impression. Set applicable/score to reflect its absence, leave evidence empty, and say plainly in "reasoning" that no transcript evidence was found — do not invent evidence to avoid an awkward low score.
4. If a dimension does not apply to this call at all (not just "poorly executed" but genuinely out of scope for this call type), set "applicable": false and explain why in reasoning; still return a score of 0 and empty evidence.
5. "quick_fix" is one concrete, actionable sentence the coach could apply on their very next call — not generic advice.
6. Score each dimension independently on its own 0-max scale. Do not apply caps, grade bands, or cross-dimension penalties yourself — a separate deterministic system does that from your raw scores. Just report what you observed.
7. Output must match the provided JSON schema exactly. No prose outside the JSON.`;

export interface BuiltPrompt {
  system: string;
  user: string;
}

export function buildEvaluationPrompt(
  rubric: RubricConfig,
  turns: TranscriptTurn[],
): BuiltPrompt {
  const transcriptText = turnsToText(turns);

  const dimensionsBlock = rubric.dimensions
    .map(
      (d, i) =>
        `${i + 1}. key: "${d.key}" | name: "${d.name}" | max_score: ${d.max_score}\n   Look for: ${d.description}`,
    )
    .join("\n\n");

  const user = `CALL TYPE: ${rubric.call_type}

RUBRIC DIMENSIONS (score every one of these ${rubric.dimensions.length} dimensions):
${dimensionsBlock}

TRANSCRIPT (each line is "[Speaker]: text" — copy quotes exactly as they appear here):
"""
${transcriptText}
"""

Return your evaluation as JSON matching the required schema. Score all ${rubric.dimensions.length} dimensions listed above, using each dimension's exact "key".`;

  return { system: SYSTEM_PROMPT, user };
}

// Use only if you need to split into two calls for context/reliability reasons.
export function splitDimensions<T extends { key: string }>(
  dimensions: T[],
  groups = 2,
): T[][] {
  const size = Math.ceil(dimensions.length / groups);
  const out: T[][] = [];
  for (let i = 0; i < dimensions.length; i += size) {
    out.push(dimensions.slice(i, i + size));
  }
  return out;
}
