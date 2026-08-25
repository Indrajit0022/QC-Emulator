// Derive a "client name" from the transcript. The DB has no client column,
// so we pull the first speaker whose label doesn't look like the coach.
// Falls back to "Client" when the transcript is empty or unparseable.
const COACH_HINTS = ["coach", "trainer", "mentor", "facilitator"];

function isCoachLabel(label: string): boolean {
  const l = label.toLowerCase();
  return COACH_HINTS.some((h) => l.includes(h));
}

export function extractClientName(transcript: string | null | undefined): string {
  if (!transcript) return "Client";
  const lines = transcript.split(/\r?\n/);
  const speakers = new Set<string>();
  let firstNonCoach: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Match [Speaker]: text or Speaker: text (up to a reasonable label length).
    const bracket = line.match(/^\[([^\]]{1,60})\]\s*:/);
    const plain = !bracket ? line.match(/^([A-Za-z][A-Za-z0-9 ._-]{0,40}?)\s*:/) : null;
    const label = (bracket?.[1] ?? plain?.[1] ?? "").trim();
    if (!label) continue;
    speakers.add(label);
    if (firstNonCoach === null && !isCoachLabel(label)) firstNonCoach = label;
  }
  return firstNonCoach ?? [...speakers][0] ?? "Client";
}

// Filesystem-safe version for PDF filenames.
export function clientNameForFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "client";
}
