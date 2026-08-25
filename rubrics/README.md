# Rubric source files

`kickoff-call-rubric.md` and `coaching-call-rubric.md` here are the real
source documents. They've been converted into
`supabase/functions/_shared/rubrics/{kickoff,coaching}.rubric.json` — the
placeholder JSON is gone; the real 12 dimensions, global caps, and grade
bands are wired in.

## One thing worth knowing before you review the JSON: normalized scoring

Both source docs say "twelve dimensions, 100 points," but the individually
documented per-dimension point values actually sum to **100** for kickoff
and **105** for coaching (coaching: 10+10+15+15+10+15+5+5+5+5+5+5 = 105, not
100 — and 90, not 85, with D4 switched off). This looks like a small
drafting inconsistency in the source rubric rather than something to
silently "fix" by rewriting one of the documented dimension point values.

Instead, `rubric-engine.ts` leans on the coaching rubric's own stated
principle #6 as the general mechanism: *"When D4 is disabled the call is
scored out of 85, not 100. The percentage is the raw score over 85. Report
the result on the 100 scale."* Every run's total is computed as a
**percentage of whatever the actually-achievable total is** (105, 90, or
100 — whatever applies once optional/inapplicable dimensions are excluded),
then reported on a normalized `/100` scale. Global caps are expressed as
percentages for the same reason. Per-dimension scores (e.g. "7/10" on one
dimension) are untouched — only the run-level total and grade are
normalized.

**Worth flagging back to whoever owns the rubric doc:** confirm whether one
of the coaching dimension point values (most likely candidates: D3, D4, or
D6, all at the higher end) was meant to be smaller so the stated values
actually sum to 100/85. If so, update the `max_score` fields in
`coaching.rubric.json` directly — the normalization approach above will
keep working correctly either way, it just stops needing to paper over the
gap once the source numbers agree.

## Structure implemented

- `redistributable: true` on a dimension (coaching D2 "Diagnostics Review",
  D4 "Movement Coaching Quality") — the model can mark it inapplicable and
  it's excluded from both the numerator and denominator, rather than scored
  0/max. MVP simplification of "redistribute weight" — the source doc
  doesn't specify exact reallocation, so points are dropped from the
  denominator rather than literally moved onto named dimensions.
- `global_caps` — cross-dimension conditions from each doc's "Global
  Automatic Score Caps" table that aren't reducible to a single dimension's
  own score (e.g. "coach speaks >70% of the call," "no follow-up questions
  anywhere"). The model reports whether each condition held (`global_flags`
  in its response); `rubric-engine.ts` — not the model — decides whether
  that lowers the final score. Caps that WERE reducible to one dimension's
  own scoring table (e.g. kickoff D10 booking, coaching D8 struggle
  handling, D10 booking) are folded directly into that dimension's
  `description` instead, since the source rubric already expresses them as
  band/bucket criteria for that one dimension.
- Calibration notes and "positive/negative signal" language from the source
  docs are folded into each dimension's `description` where they'd actually
  change a score (e.g. kickoff D5's "accept any Halden Method phrasing,"
  D1's "credit conduct not disclosure"). Role-play anecdotes and pure
  flavor text were left out to keep the prompt from growing past what's
  useful for scoring.
