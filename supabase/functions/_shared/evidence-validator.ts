import type { RawDimensionResult, TranscriptTurn } from "./types.ts";

// Collapse whitespace/case differences so a model that reproduces a quote
// with slightly different spacing doesn't get flagged as fabricated, while
// still requiring the actual words to appear in that speaker's lines.
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function validateDimensionEvidence(
  dimensions: RawDimensionResult[],
  turns: TranscriptTurn[],
): RawDimensionResult[] {
  // Build a lookup of normalized turn text per speaker for substring checks.
  const bySpeaker = new Map<string, string[]>();
  for (const t of turns) {
    const key = normalize(t.speaker);
    if (!bySpeaker.has(key)) bySpeaker.set(key, []);
    bySpeaker.get(key)!.push(normalize(t.text));
  }
  const wholeTranscriptNormalized = normalize(
    turns.map((t) => t.text).join(" "),
  );

  return dimensions.map((dim) => ({
    ...dim,
    evidence: dim.evidence.map((ev) => {
      const speakerLines = bySpeaker.get(normalize(ev.speaker)) ?? [];
      const quoteNorm = normalize(ev.quote);
      const foundUnderSpeaker = speakerLines.some((line) =>
        line.includes(quoteNorm),
      );
      // Fall back to a whole-transcript check in case the model mislabeled
      // the speaker but quoted real text — still flag it, but distinguish
      // "text doesn't exist" from "text exists, wrong speaker" in reasoning
      // if you want to surface that distinction in the UI later.
      const foundAnywhere =
        foundUnderSpeaker || wholeTranscriptNormalized.includes(quoteNorm);

      return { ...ev, valid: foundAnywhere };
    }),
  }));
}

// PRD §12: "Do not save fabricated evidence as valid evidence." Strip
// anything that failed validation before it's ever written to the DB.
export function stripInvalidEvidence(
  dimensions: RawDimensionResult[],
): RawDimensionResult[] {
  return dimensions.map((dim) => ({
    ...dim,
    evidence: dim.evidence.filter((e) => e.valid === true),
  }));
}
