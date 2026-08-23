import type { RubricConfig, TranscriptTurn } from "./types.ts";
import { turnsToText } from "./transcript-parser.ts";

// ---------------------------------------------------------------------------
// Design note: still ONE call for all 12 dimensions + report fields + global
// flags, for the rate-limit reasons noted throughout this repo (OpenRouter
// free tier: 50 req/day, 20/min). If a chosen free model can't reliably fill
// this out in one shot, use splitDimensions() below and merge two calls —
// global_flags only need to be asked once (attach to whichever call group
// you send first).
// ---------------------------------------------------------------------------

export function buildResponseSchema(rubric: RubricConfig) {
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
    required: ["dimensions", "global_flags", "brief", "red_flags", "one_thing"],
  } as const;
}

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
): BuiltPrompt {
  const transcriptText = turnsToText(turns);

  const dimensionsBlock = rubric.dimensions
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

  const user = `CALL TYPE: ${rubric.call_type}

RUBRIC DIMENSIONS (score every one of these ${rubric.dimensions.length} dimensions):
${dimensionsBlock}

GLOBAL CONDITIONS TO CHECK (report one flag per condition, regardless of outcome):
${globalCapsBlock}

TRANSCRIPT (each line is "[Speaker]: text" — copy quotes exactly as they appear here):
"""
${transcriptText}
"""

Return your evaluation as JSON matching the required schema. Score all ${rubric.dimensions.length} dimensions using each dimension's exact "key", and report all ${rubric.global_caps.length} global flags using each condition's exact "key".`;

  return { system: baseSystemPrompt(rubric), user };
}

// Use only if a model can't reliably fill out all 12 dimensions in one call —
// split into N calls and merge dimensions[] + carry global_flags from
// whichever call you send them with (attach globalCaps to group 0 only).
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
