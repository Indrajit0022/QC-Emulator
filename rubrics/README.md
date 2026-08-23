# Rubric source files

Drop the two provided rubric documents here:

- `kickoff-call-rubric.md`
- `coaching-call-rubric.md`

They're not consumed directly by the app — convert each into the structured
JSON shape at `supabase/functions/_shared/rubrics/{kickoff,coaching}.rubric.json`
(matching the `RubricConfig` type in `supabase/functions/_shared/types.ts`):

```json
{
  "call_type": "kickoff",
  "dimensions": [
    {
      "key": "goal_clarity",
      "name": "Goal Clarity",
      "max_score": 10,
      "description": "What the model should look for — feeds directly into the LLM prompt.",
      "cap": {
        "condition": "dimension_at_or_below",
        "dimensionKey": "goal_clarity",
        "threshold": 3,
        "capValue": 60
      }
    }
  ],
  "max_score": 100,
  "grade_bands": [
    { "min": 90, "max": 100, "grade": "Excellent" },
    { "min": 75, "max": 89, "grade": "Strong" },
    { "min": 60, "max": 74, "grade": "Developing" },
    { "min": 0, "max": 59, "grade": "Needs Work" }
  ]
}
```

`cap` is optional and only needed for dimensions where the rubric defines an
automatic score cap (PRD §15's "82/100 capped to 70/100 because dimension X
scored too low" rule). Add one `cap` block per capping rule the real rubric
defines — `applyRubricRules` in `rubric-engine.ts` already applies any of
these it finds.

The `description` field for each dimension is what actually gets sent to the
model (see `prompt-builder.ts`) — copy the rubric's own language for what
"good" looks like on that dimension so the model is grading against the
document, not a paraphrase of it.
