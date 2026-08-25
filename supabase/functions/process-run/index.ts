// supabase/functions/process-run/index.ts
//
// Invoked every ~10s by pg_cron (see supabase/migrations/0003_cron.sql).
// Claims exactly ONE run and advances it by one unit of work, then returns.
// This keeps every invocation short (well under the 150s free-tier Edge
// Function timeout): most stages are trivial, and the scoring stage does one
// group of dimensions per tick rather than all 12 in a single call.
//
// Deploy: supabase functions deploy process-run
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// The OpenRouter credential and model id come from either an Edge Function
// secret or Postgres Vault — see resolveOpenRouterConfig below.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadRubric } from "../_shared/rubric-loader.ts";
import { parseTranscript } from "../_shared/transcript-parser.ts";
import {
  buildEvaluationPrompt,
  buildResponseSchema,
  buildSummaryPrompt,
  SUMMARY_SCHEMA,
} from "../_shared/prompt-builder.ts";
import { callOpenRouterForJson, OpenRouterError } from "../_shared/openrouter-client.ts";
import { validateDimensionEvidence, stripInvalidEvidence } from "../_shared/evidence-validator.ts";
import { applyRubricRules, evidenceCoverage } from "../_shared/rubric-engine.ts";
import type {
  FinalDimensionResult,
  GlobalFlagResult,
  RawDimensionResult,
  RunRow,
} from "../_shared/types.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function vaultSecret(name: string): Promise<string | undefined> {
  const { data, error } = await supabase.rpc("get_secret", { secret_name: name });
  if (error) return undefined;
  return (data as string | null) ?? undefined;
}

// Both the credential and the model id can come from an Edge Function secret
// or, failing that, Postgres Vault. The Vault path can be provisioned purely
// over SQL, so the free-tier model can be swapped without a redeploy when
// OpenRouter rotates its free lineup.
async function resolveOpenRouterConfig(): Promise<{
  apiKey: string | undefined;
  model: string | undefined;
}> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ??
    (await vaultSecret("openrouter_api_key"));
  const model = Deno.env.get("OPENROUTER_MODEL") ??
    (await vaultSecret("openrouter_model"));
  return { apiKey, model };
}

// ~20 ticks at 10s each: a few minutes of riding out an upstream rate limit
// before the run is declared failed.
const MAX_ATTEMPTS = 20;

// Dimensions scored per LLM call. Scoring is resumable: each cron tick scores
// the next unscored group and stays on `scoring_dimensions` until all 12 are
// done. That keeps every invocation well inside the Edge Function wall-clock
// limit even for the 65k-character transcript (PRD §24).
const DIMENSIONS_PER_CALL = 4;

interface DraftReport {
  dimensions: RawDimensionResult[];
  global_flags: GlobalFlagResult[];
}

interface ModelResponseShape {
  dimensions: RawDimensionResult[];
  global_flags: GlobalFlagResult[];
}

interface SummaryShape {
  brief: string;
  red_flags: string[];
  one_thing: string;
}

Deno.serve(async (_req) => {
  // 1. Atomically claim the oldest unfinished run.
  const { data: run, error: claimError } = await supabase
    .rpc("claim_next_run")
    .single<RunRow>();

  if (claimError) {
    return json({ error: claimError.message }, 500);
  }
  if (!run || !run.id) {
    // Nothing to do this tick — normal, not an error.
    return json({ ok: true, claimed: false });
  }

  try {
    switch (run.processing_stage) {
      case "created":
        await advance(run.id, "loading_rubric");
        break;

      case "loading_rubric": {
        // Just validates the rubric exists/loads for this call type before
        // committing to processing_transcript — cheap, fast-fail if the
        // rubric JSON is missing or malformed.
        loadRubric(run.call_type);
        await advance(run.id, "processing_transcript");
        break;
      }

      case "processing_transcript": {
        const turns = parseTranscript(run.transcript);
        if (turns.length === 0) {
          throw new Error(
            "Transcript did not contain any recognizable '[Speaker]: text' lines.",
          );
        }
        await advance(run.id, "extracting_evidence");
        break;
      }

      case "extracting_evidence":
        // Evidence is extracted as part of scoring (the model returns quotes
        // alongside each score, which are then validated against the
        // transcript). This stage exists so the UI timeline matches PRD §7;
        // it does no work of its own.
        await advance(run.id, "scoring_dimensions");
        break;

      case "scoring_dimensions": {
        const rubric = loadRubric(run.call_type);
        const turns = parseTranscript(run.transcript);

        // Resume from whatever earlier ticks already scored.
        const { data: fresh } = await supabase
          .from("runs")
          .select("report")
          .eq("id", run.id)
          .single();
        const draft = (fresh?.report?._draft ?? {}) as Partial<DraftReport>;
        const scored = draft.dimensions ?? [];
        const scoredKeys = new Set(scored.map((d) => d.key));

        const remaining = rubric.dimensions.filter((d) => !scoredKeys.has(d.key));
        if (remaining.length === 0) {
          await advance(run.id, "applying_rules");
          break;
        }

        const group = remaining.slice(0, DIMENSIONS_PER_CALL);
        // Global flags are transcript-wide, so they only need asking once.
        const isFirstGroup = scored.length === 0;

        const prompt = buildEvaluationPrompt(rubric, turns, group, isFirstGroup);
        const cfg = await resolveOpenRouterConfig();
        const { data, model } = await callOpenRouterForJson<ModelResponseShape>(
          prompt,
          buildResponseSchema(rubric, isFirstGroup),
          cfg.apiKey,
          cfg.model,
        );

        // Keep only what we asked for, so a chatty model can't inject keys
        // from another group and cut the loop short.
        const requested = new Set(group.map((d) => d.key));
        const returned = (data.dimensions ?? []).filter((d) => requested.has(d.key));

        // A group that comes back with nothing usable would otherwise spin on
        // this stage forever; fail loudly instead.
        if (returned.length === 0) {
          throw new Error(
            `Model returned no results for dimensions: ${group.map((d) => d.key).join(", ")}`,
          );
        }

        const validated = validateDimensionEvidence(returned, turns);
        const cleaned = stripInvalidEvidence(validated);

        const mergedDimensions = [...scored, ...cleaned];
        const nextDraft: DraftReport = {
          dimensions: mergedDimensions,
          global_flags: isFirstGroup ? (data.global_flags ?? []) : (draft.global_flags ?? []),
        };

        await supabase
          .from("runs")
          .update({ model, attempts: 0, report: { _draft: nextDraft } })
          .eq("id", run.id);

        // Advance only once every dimension is scored; otherwise stay here and
        // let the next tick pick up the following group.
        if (mergedDimensions.length >= rubric.dimensions.length) {
          await advance(run.id, "applying_rules");
        }
        break;
      }

      case "applying_rules": {
        const rubric = loadRubric(run.call_type);
        const { data: fresh } = await supabase
          .from("runs")
          .select("report")
          .eq("id", run.id)
          .single();

        const draft = fresh?.report?._draft as DraftReport | undefined;
        if (!draft) throw new Error("Missing scored dimensions before applying rubric rules.");

        const rules = applyRubricRules(draft.dimensions, draft.global_flags ?? [], rubric);

        // Persist the dimension rows (PRD §20's evaluation_dimensions table).
        const rows = rules.dimensions.map((d) => ({
          run_id: run.id,
          dimension_key: d.key,
          dimension_name: d.name,
          score: d.score,
          max_score: d.max_score,
          reasoning: d.reasoning,
          evidence: d.evidence,
          quick_fix: d.quick_fix,
          is_applicable: d.applicable,
        }));
        await supabase.from("evaluation_dimensions").upsert(rows, {
          onConflict: "run_id,dimension_key",
        });

        await supabase
          .from("runs")
          .update({
            total_score: rules.totalScore,
            max_score: rules.maxScore,
            grade: rules.grade,
            report: {
              _draft: draft,
              _rules: {
                totalScore: rules.totalScore,
                maxScore: rules.maxScore,
                grade: rules.grade,
                capsApplied: rules.capsApplied,
                // building_report summarises from this, so the scorecard has
                // to survive the stage boundary.
                dimensions: rules.dimensions,
              },
            },
          })
          .eq("id", run.id);

        await advance(run.id, "building_report");
        break;
      }

      case "building_report": {
        const rubric = loadRubric(run.call_type);
        const { data: fresh } = await supabase
          .from("runs")
          .select("report, total_score, max_score, grade")
          .eq("id", run.id)
          .single();

        const rulesResult = fresh?.report?._rules as
          | {
              capsApplied: string[];
              dimensions: FinalDimensionResult[];
              totalScore: number;
              maxScore: number;
              grade: string;
            }
          | undefined;
        if (!rulesResult) {
          throw new Error("Missing scored dimensions before building final report.");
        }

        const { data: dimRows } = await supabase
          .from("evaluation_dimensions")
          .select("evidence")
          .eq("run_id", run.id);

        const coverage = evidenceCoverage(
          (dimRows ?? []).map((r: { evidence: unknown[] }) => ({ evidence: r.evidence }) as never),
        );

        // The narrative pass runs here, against the finished scorecard, so the
        // model judges the whole call rather than one group of dimensions.
        const cfg = await resolveOpenRouterConfig();
        const { data: summary } = await callOpenRouterForJson<SummaryShape>(
          buildSummaryPrompt(
            rubric,
            rulesResult.dimensions,
            rulesResult.totalScore,
            rulesResult.maxScore,
            rulesResult.grade,
            rulesResult.capsApplied ?? [],
          ),
          SUMMARY_SCHEMA as unknown as Record<string, unknown>,
          cfg.apiKey,
          cfg.model,
        );

        const finalReport = {
          one_thing: {
            text: summary.one_thing,
            score_without: fresh?.total_score ?? 0,
            // A real "with" estimate needs rubric-specific what-if modelling;
            // the MVP ships the model's qualitative recommendation only.
            score_with_estimate: fresh?.total_score ?? 0,
          },
          brief: summary.brief,
          red_flags: summary.red_flags ?? [],
          evidence_coverage: coverage,
          caps_applied: rulesResult.capsApplied ?? [],
        };

        await supabase
          .from("runs")
          .update({
            report: finalReport,
            status: "completed",
            processing_stage: "completed",
            error: null,
            processing_completed_at: new Date().toISOString(),
          })
          .eq("id", run.id);
        break;
      }

      case "completed":
        // Nothing to do — shouldn't normally be claimable since claim_next_run
        // only selects queued/processing, but guard anyway.
        break;
    }

    return json({ ok: true, claimed: true, run_id: run.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = (run.attempts ?? 0) + 1;
    const retryable = err instanceof OpenRouterError && err.retryable;

    // A transient upstream failure leaves the run claimable at the same
    // stage, so the next cron tick simply tries again. The run only fails
    // for good once the attempt budget is gone.
    if (retryable && attempts < MAX_ATTEMPTS) {
      await supabase
        .from("runs")
        .update({
          attempts,
          error: `Transient upstream error (attempt ${attempts}/${MAX_ATTEMPTS}), retrying: ${message}`,
        })
        .eq("id", run.id);

      return json({ ok: true, run_id: run.id, retrying: true, attempts }, 200);
    }

    await supabase
      .from("runs")
      .update({
        status: "failed",
        attempts,
        error: retryable
          ? `Gave up after ${attempts} attempts. Last error: ${message}`
          : message,
      })
      .eq("id", run.id);

    return json({ ok: false, run_id: run.id, error: message }, 200);
  }
});

async function advance(runId: string, stage: RunRow["processing_stage"]) {
  await supabase.from("runs").update({ processing_stage: stage }).eq("id", runId);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
