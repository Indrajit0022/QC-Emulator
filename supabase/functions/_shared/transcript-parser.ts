import type { TranscriptTurn } from "./types.ts";

// Parses lines shaped like:
//   [Coach]: What would you like to achieve?
//   [Client]: I want to grow the team.
// into { speaker, text } turns. Tolerates blank lines and turns that wrap
// across multiple physical lines (a turn continues until the next
// "[Speaker]:" marker or end of transcript).
const TURN_START = /^\s*\[([^\]]+)\]\s*:\s?(.*)$/;

export function parseTranscript(raw: string): TranscriptTurn[] {
  const lines = raw.split(/\r?\n/);
  const turns: TranscriptTurn[] = [];

  for (const line of lines) {
    const match = line.match(TURN_START);
    if (match) {
      const [, speaker, text] = match;
      turns.push({ speaker: speaker.trim(), text: text.trim() });
    } else if (line.trim().length > 0 && turns.length > 0) {
      // continuation of the previous turn (wrapped line)
      turns[turns.length - 1].text =
        `${turns[turns.length - 1].text} ${line.trim()}`.trim();
    }
    // blank lines and any leading junk before the first "[Speaker]:" are skipped
  }

  return turns;
}

// Re-serializes turns back to the "[Speaker]: text" format the model was
// shown, so evidence-validation substring checks are comparing apples to apples.
export function turnsToText(turns: TranscriptTurn[]): string {
  return turns.map((t) => `[${t.speaker}]: ${t.text}`).join("\n");
}
