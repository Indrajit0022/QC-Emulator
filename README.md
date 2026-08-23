# Call Evaluation System — MVP

Paste a call transcript, pick Kick-off or Coaching, get a scored 12-dimension
report with transcript-verified evidence and a downloadable PDF. Background
processing survives closing the browser.

Stack: React/Vite/TS/Tailwind → Supabase (Postgres + Edge Functions + Realtime + pg_cron) → Vercel → OpenRouter (free tier).

## What's already built here

```
supabase/migrations/0001_init.sql     schema, RLS, claim_next_run(), Realtime
supabase/migrations/0002_secret_reader.sql  get_secret(): lets the worker read Vault
supabase/migrations/0003_cron.sql     pg_cron job that ticks the worker
supabase/functions/process-run/       the step-machine worker (one stage per invocation)
supabase/functions/_shared/           parsing, prompt, OpenRouter client, evidence
                                       validation, deterministic rubric engine
rubrics/                              real rubric .md source + conversion notes (see rubrics/README.md)
frontend/src/                         Home → run creation → live processing view →
                                       completed report → client-side PDF
```

The rubric JSON files under `supabase/functions/_shared/rubrics/` now
contain the real 12 dimensions, global caps, and grade bands converted from
`rubrics/kickoff-call-rubric.md` and `rubrics/coaching-call-rubric.md` — see
`rubrics/README.md` for one important note on how run totals are normalized
to a `/100` scale (the source docs' own per-dimension point values don't
quite sum to the "100 points" they state as the headline total — worth a
quick look, not a blocker).

## Live deployment

| Piece | Where |
|---|---|
| App | https://call-eval-system-indrajit0022s-projects.vercel.app |
| Supabase project ref | `tyjbfyxlpoefqezbjwfy` (region `ap-south-1`, free tier) |
| Worker | Edge Function `process-run`, ticked every 10s by `pg_cron` |

The frontend reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build
time. The anon key is public by design — RLS (migration 0001) is what
protects the data: anonymous clients may insert a run and read runs and
dimensions, and nothing else. Every write to `status`, `report`, scores, and
dimension rows happens server-side under the service role, inside the Edge
Function.

The OpenRouter key is never in this repo and never reaches the browser. The
worker resolves it from either the `OPENROUTER_API_KEY` Edge Function secret
or, failing that, Postgres Vault via `public.get_secret()` (migration 0002),
which only `service_role` may execute.

## Why the architecture looks like this

- **One (or two) LLM call(s) per run, not twelve.** OpenRouter's free tier
  is 20 req/min and 50 req/day. `prompt-builder.ts` scores all 12 dimensions
  and drafts the brief/red-flags/one-thing in a single structured call.
- **A pg_cron step machine instead of one long function.** Supabase Edge
  Functions time out at 150s on the free tier; a slow free model plus a
  65k-character transcript can get close to that. `process-run` claims one
  run and advances it exactly one stage per invocation, so each call stays
  short and the whole thing is resumable and debuggable stage-by-stage.
- **The LLM never grades itself.** `rubric-engine.ts` applies caps and grade
  bands in plain TypeScript from the model's raw per-dimension scores.
  `evidence-validator.ts` checks every quote against the actual transcript
  text before it's ever stored — fabricated evidence never reaches the DB.

## Setup (run these, in order)

### 1. Supabase project
```bash
npx supabase login
npx supabase init            # if not already run
npx supabase link --project-ref <PROJECT_REF>
```

### 2. Database
Edit `supabase/migrations/0002_cron.sql` — fill in `<PROJECT_REF>` and
`<SERVICE_ROLE_KEY>` (Project Settings → API). Then:
```bash
npx supabase db push
```

### 3. Rubrics
Already converted — `supabase/functions/_shared/rubrics/{kickoff,coaching}.rubric.json`
have the real 12 dimensions each. Read `rubrics/README.md` before relying on
the totals: run-level scores are normalized to `/100`, and there's a small
point-value inconsistency in the source docs worth confirming with whoever
owns the rubric.

### 4. Edge Function secrets
```bash
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set OPENROUTER_MODEL=<a-current-free-model-id>   # optional, has a default
```
Pick the model from https://openrouter.ai/models filtered to `:free`,
sorted by context length — the free lineup rotates, so don't assume the
default in `openrouter-client.ts` is still live.

### 5. Deploy the function
```bash
npx supabase functions deploy process-run
```

### 6. Frontend
```bash
cd frontend
npm create vite@latest . -- --template react-ts     # if not already scaffolded
npm install @supabase/supabase-js react-router-dom @react-pdf/renderer
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
cp .env.example .env.local     # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```
(The `tailwind.config.ts`, `src/App.tsx`, `src/pages/*`, `src/components/*`,
`src/lib/*` files in this repo are the real source — the vite scaffold
command above just needs to not overwrite them, or copy them back in after.)

### 7. Deploy frontend to Vercel
```bash
cd frontend
vercel --prod
```
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel project env vars.

## Testing checklist (PRD §29)
Once the rubric JSON + the 4 provided transcripts are in place, run each
transcript through and verify: correct rubric selected, all 12 dimensions
scored, evidence quotes actually exist in the transcript, missing evidence
reported as missing (not guessed), caps applied, PDF matches the web report,
run survives closing the browser mid-processing, and a deliberately broken
run (e.g. malformed OPENROUTER_MODEL) shows the error UI instead of hanging.

## Known MVP simplifications (call out in the Loom)
- `one_thing.score_with_estimate` currently mirrors the actual score — a
  real "if you fixed this, you'd score X" estimate needs rubric-aware
  what-if modeling, left out for time.
- No chunking/retrieval step: the whole transcript goes to the model in one
  call, relying on a large-context free model rather than a map-reduce
  pipeline. Revisit if the chosen model's context window can't fit the
  65k-character transcript + rubric.
- No auth — the run URL is the access control, per the PRD's explicit
  non-goal of building user management.
