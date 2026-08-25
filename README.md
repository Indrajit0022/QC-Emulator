# Call Evaluation System — MVP

> Evidence-backed call evaluation for coaching teams.

A lightweight call-quality evaluation system built for the BeaverMind hiring exercise.

Paste a call transcript, choose **Kick-off** or **Coaching**, and get a scored 12-dimension evaluation with transcript-verified evidence, recommendations, and a downloadable PDF.

The system is designed around one main idea:

**A score should be explainable.**

---

## ✦ What it does

```text
Transcript
    ↓
Select Call Type
    ↓
Load Rubric
    ↓
Process Transcript
    ↓
Extract Evidence
    ↓
Score 12 Dimensions
    ↓
Apply Rubric Rules & Caps
    ↓
Generate Report
    ↓
PDF
````

The operator only needs to provide the transcript and call type.

Behind the scenes, the evaluation is persisted and processed in the background, so the browser does not need to stay open.

---

## ✦ Core Features

* Kick-off and Coaching call evaluation
* 12 rubric dimensions per call type
* Transcript-backed evidence for every dimension
* Evidence validation against the original transcript
* Deterministic scoring rules and global caps
* Persistent evaluation runs with unique URLs
* Background processing
* Realtime run status
* Clear failure states instead of infinite loading
* Overall score and grade
* The One Thing
* Red Flags
* Dimension-level reasoning
* Quick fixes
* Evaluation history
* Downloadable PDF report

---

## ✦ Architecture

```text
┌──────────────────────┐
│      React / Vite    │
│    Frontend + UI     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Supabase        │
│ Postgres + Realtime  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Edge Function      │
│    process-run       │
│   Step-machine       │
└──────────┬───────────┘
           │
      ┌────┴────┐
      ▼         ▼
┌──────────┐ ┌─────────────┐
│ Rubrics  │ │  OpenRouter │
│ + Rules  │ │     LLM     │
└──────────┘ └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │  Evidence   │
             │ Validation  │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │   Report    │
             │   + PDF     │
             └─────────────┘
```

---

## ✦ Why it is built this way

### One or two LLM calls per evaluation

The system does not make a separate LLM request for every dimension.

The evaluation pipeline sends the rubric and transcript through a structured evaluation flow and scores all 12 dimensions together.

This keeps the number of model calls low and works better with free-tier model limits.

### Background step-machine

A single long-running function is not ideal for large transcripts.

The worker processes a run one stage at a time:

```text
created
   ↓
loading_rubric
   ↓
processing_transcript
   ↓
extracting_evidence
   ↓
scoring_dimensions
   ↓
generating_report
   ↓
completed
```

Each stage is resumable and the run state is stored in Supabase.

This also means the browser is not responsible for keeping the evaluation alive.

### The LLM does not control the final score

The model handles transcript understanding, reasoning and evidence extraction.

The deterministic rubric engine handles:

* Dimension scoring
* Score limits
* Global caps
* Grade bands
* Normalization

This gives the final score a predictable layer outside the model.

### Evidence is validated

The evaluator returns transcript evidence for each dimension.

Before that evidence is stored, it is checked against the original transcript.

If the evidence isn't actually present, it should not be treated as valid evidence.

This is important because a convincing-looking AI explanation is not useful if the quote never happened.

---

## ✦ Rubrics

The project uses the real rubrics supplied with the exercise:

```text
rubrics/
├── kickoff-call-rubric.md
├── coaching-call-rubric.md
└── README.md
```

The worker uses converted rubric JSON files containing:

* 12 dimensions
* Scoring rules
* Global caps
* Grade bands
* Rubric-specific conditions

The source rubrics have some differences between their stated headline totals and the individual dimension values, so the evaluation engine normalizes the final result to a `/100` scale.

---

## ✦ Persistent Runs

Every evaluation has its own run.

That means:

* The result can be reopened later
* The run has its own URL
* Processing can continue after the browser is closed
* The current state is stored
* Errors are stored against the run
* Completed reports remain available

The run URL effectively becomes the reference to that evaluation.

---

## ✦ Failure Handling

A failed run should fail clearly.

Instead of:

```text
Evaluating...
Evaluating...
Evaluating...
```

forever, the system stores the actual failure and exposes it in the UI.

This was especially important for testing model/API failures and long-running evaluations.

---

## ✦ Tech Stack

| Layer           | Technology                 |
| --------------- | -------------------------- |
| Frontend        | React + Vite + TypeScript  |
| Styling         | Tailwind CSS               |
| Database        | Supabase Postgres          |
| Backend         | Supabase Edge Functions    |
| Background jobs | pg_cron                    |
| Realtime        | Supabase Realtime          |
| LLM             | OpenRouter                 |
| Deployment      | Vercel                     |
| PDF             | Client-side PDF generation |

---

## ✦ Repository Structure

```text
supabase/
├── migrations/
│   ├── 0001_init.sql
│   ├── 0002_secret_reader.sql
│   └── 0003_cron.sql
│
└── functions/
    ├── process-run/
    └── _shared/
        ├── parsing
        ├── prompt builder
        ├── OpenRouter client
        ├── evidence validation
        └── rubric engine

rubrics/
├── kickoff-call-rubric.md
├── coaching-call-rubric.md
└── README.md

frontend/
└── src/
    ├── pages/
    ├── components/
    └── lib/
```

---

## ✦ Live Deployment

**App**

[https://call-eval-system-indrajit0022s-projects.vercel.app](https://call-eval-system-indrajit0022s-projects.vercel.app)

**Worker**

`process-run` Supabase Edge Function

**Scheduler**

`pg_cron` runs the worker every 10 seconds.

---

## ✦ Security

The OpenRouter API key is never exposed to the browser or committed to the repository.

The frontend only uses the public Supabase client configuration.

Server-side writes to evaluation state, scores and reports happen through the backend worker.

The OpenRouter key is resolved server-side through the Edge Function secret or Supabase Vault.

---

## ✦ Testing

The main testing checklist covers:

* Correct rubric selection
* All 12 dimensions scored
* Evidence actually exists in the transcript
* Missing evidence is reported instead of guessed
* Global caps are applied
* Final score is normalized correctly
* PDF matches the web report
* Run survives closing the browser
* Failed runs show the actual error
* Long transcripts can complete successfully

The four supplied transcripts are used for evaluation testing:

```text
kickoff-01.txt
kickoff-02.txt
coaching-01.txt
coaching-02.txt
```

---

## ✦ What was challenging

The main challenge wasn't simply connecting a transcript to an LLM.

The harder parts were making the evaluator behave like an actual system:

* Converting human-written rubrics into machine-readable scoring logic
* Keeping evidence tied to the source transcript
* Handling different rules between Kick-off and Coaching calls
* Applying caps and normalization outside the LLM
* Processing large transcripts
* Running evaluations asynchronously
* Persisting state across browser sessions
* Handling failures cleanly
* Producing a report that is useful to someone reviewing a real call

---

## ✦ AI-Assisted Development

AI was used heavily during development.

I used AI tools for scaffolding, implementation, debugging, exploring approaches, reviewing code and working through issues during development.

I still tested the generated code, inspected the outputs, investigated failures and made the decisions around the architecture, scoring flow, evidence validation and what was actually shipped.

I treated AI as another development tool rather than something that should be trusted blindly.

---

## ✦ MVP Trade-offs

A few things were intentionally kept out of the MVP.

### What-if score

The current `score_with_estimate` value mirrors the actual score.

A proper "if you fixed this, your score would become X" calculation would need rubric-aware what-if scoring.

### No retrieval / chunking pipeline

The current implementation sends the transcript through the evaluation flow as a whole rather than building a separate retrieval or map-reduce system.

This keeps the MVP simpler and works with large-context models.

### No authentication

The exercise did not require a full user-management system.

The evaluation URL is currently the way a run is accessed.

These are deliberate MVP trade-offs rather than unfinished core requirements.

---

## ✦ Scope

The product intentionally stays focused on the requested workflow:

**Paste transcript → Evaluate → Evidence → Report → PDF**

No voice agent, no unrelated CRM features, and no unnecessary product surface.

The goal was to make the core evaluator reliable first.

---

## Built by

**Indrajit**

Built as part of the BeaverMind AI-Native Developer exercise.

```
```
