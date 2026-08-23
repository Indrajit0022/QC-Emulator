// supabase/functions/process-run/index.ts
//
// Invoked every ~10s by pg_cron (see supabase/migrations/0003_cron.sql).
// Claims exactly ONE run and advances it exactly ONE stage, then returns.
// This keeps every invocation short (well under the 150s free-tier Edge
// Function timeout) even though a full run passes through 7 stages and one
// slow free-tier LLM call.
//
// Deploy: supabase functions deploy process-run
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// The OpenRouter credential and model id come from either an Edge Function
// secret or Postgres Vault — see resolveOpenRouterConfig below.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadRubric } from "../_shared/rubric-loader.ts";
import { parseTranscript } from "../_shared/transcript-parser.ts";
import { buildEvaluationPrompt, buildResponseSchema } from "../_shared/prompt-builder.ts";
import { callOpenRouterForJson } from "../_shared/openrouter-client.ts";
import { validateDimensionEvidence, stripInvalidEvidence } from "../_shared/evidence-validator.ts";
import { applyRubricRules, evidenceCoverage } from "../_shared/rubric-engine.ts";
import type { GlobalFlagResult, RawDimensionResult, RunRow } from "../_shared/types.ts";

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

interface ModelResponseShape {
  dimensions: RawDimensionResult[];
  global_flags: GlobalFlagResult[];
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
        // Evidence extraction happens inside the single scoring call for
        // rate-limit reasons (see prompt-builder.ts design note). This stage
        // exists purely so the UI timeline matches PRD §7; it does no work
        // of its own.
        await advance(run.id, "scoring_dimensions");
        break;

      case "scoring_dimensions": {
        const rubric = loadRubric(run.call_type);
        const turns = parseTranscript(run.transcript);
        const prompt = buildEvaluationPrompt(rubric, turns);

        const cfg = await resolveOpenRouterConfig();
        const { data, model } = await callOpenRouterForJson<ModelResponseShape>(
          prompt,
          buildResponseSchema(rubric),
          cfg.apiKey,
          cfg.model,
        );

        const validated = validateDimensionEvidence(data.dimensions, turns);
        const cleaned = stripInvalidEvidence(validated);

        // Stash the raw model output on the row so applying_rules doesn't
        // need to re-call the LLM. `report` is jsonb, so we can park a
        // temporary `_draft` key here and overwrite it in building_report.
        await supabase
          .from("runs")
          .update({
            model,
            report: {
              _draft: {
                dimensions: cleaned,
                global_flags: data.global_flags,
                brief: data.brief,
                red_flags: data.red_flags,
                one_thing: data.one_thing,
              },
            },
          })
          .eq("id", run.id);

        await advance(run.id, "applying_rules");
        break;
      }

      case "applying_rules": {
        const rubric = loadRubric(run.call_type);
        const { data: fresh } = await supabase
          .from("runs")
          .select("report")
          .eq("id", run.id)
          .single();

        const draft = fresh?.report?._draft as
          | {
              dimensions: RawDimensionResult[];
              global_flags: GlobalFlagResult[];
              brief: string;
              red_flags: string[];
              one_thing: string;
            }
          | undefined;
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
              _draft: draft, // still needed by building_report
              _rules: {
                totalScore: rules.totalScore,
                maxScore: rules.maxScore,
                grade: rules.grade,
                capsApplied: rules.capsApplied,
              },
            },
          })
          .eq("id", run.id);

        await advance(run.id, "building_report");
        break;
      }

      case "building_report": {
        const { data: fresh } = await supabase
          .from("runs")
          .select("report, total_score, max_score")
          .eq("id", run.id)
          .single();

        const draft = fresh?.report?._draft as
          | { brief: string; red_flags: string[]; one_thing: string; dimensions: RawDimensionResult[] }
          | undefined;
        const rulesResult = fresh?.report?._rules as
          | { capsApplied: string[] }
          | undefined;
        if (!draft) throw new Error("Missing draft report before building final report.");

        const { data: dimRows } = await supabase
          .from("evaluation_dimensions")
          .select("evidence")
          .eq("run_id", run.id);

        const coverage = evidenceCoverage(
          (dimRows ?? []).map((r: { evidence: unknown[] }) => ({ evidence: r.evidence }) as never),
        );

        const finalReport = {
          one_thing: {
            text: draft.one_thing,
            score_without: fresh?.total_score ?? 0,
            // A real "with" estimate needs rubric-specific modeling; MVP
            // ships the model's qualitative estimate only. Revisit once the
            // real rubric caps are wired in.
            score_with_estimate: fresh?.total_score ?? 0,
          },
          brief: draft.brief,
          red_flags: draft.red_flags,
          evidence_coverage: coverage,
          caps_applied: rulesResult?.capsApplied ?? [],
        };

        await supabase
          .from("runs")
          .update({
            report: finalReport,
            status: "completed",
            processing_stage: "completed",
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
    await supabase
      .from("runs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", run.id);

    return json({ ok: false, run_id: run.id, error: String(err) }, 200);
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
