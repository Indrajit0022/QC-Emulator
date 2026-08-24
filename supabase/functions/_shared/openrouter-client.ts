import type { BuiltPrompt } from "./prompt-builder.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Fallback only. Prefer setting the model via the OPENROUTER_MODEL secret or
// the 'openrouter_model' Vault entry, because OpenRouter's free lineup
// rotates — the previous default here ("qwen/qwen3-coder:free") was already
// delisted. To see what is currently free and supports structured output:
//   select net.http_get('https://openrouter.ai/api/v1/models');
// then filter on id like '%:free' and supported_parameters ? 'structured_outputs'.
const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// Edge Functions get ~150s of wall clock; abort before that so the failure is
// ours to handle rather than an opaque runtime kill.
const REQUEST_TIMEOUT_MS = 110_000;

// `retryable` marks failures worth another cron tick rather than a permanent
// failure: upstream rate limits on the shared free-tier pool (429), provider
// 5xx, and requests that never left the box.
export class OpenRouterError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

export async function callOpenRouterForJson<T>(
  prompt: BuiltPrompt,
  schema: Record<string, unknown>,
  // Overrides supplied by the worker when these live in Vault rather than in
  // Edge Function secrets (see resolveOpenRouterConfig in process-run).
  apiKeyOverride?: string,
  modelOverride?: string,
): Promise<{ data: T; model: string }> {
  const apiKey = apiKeyOverride ?? Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new OpenRouterError("OPENROUTER_API_KEY is not set");
  const model = modelOverride ?? Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_MODEL;

  // Bound the request well inside the Edge Function's wall-clock limit. If the
  // runtime kills the invocation instead, the catch block below never runs and
  // the run would sit in `processing` forever — so we'd rather abort first and
  // surface a retryable error. (A stuck-run watchdog in SQL is the backstop.)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter asks free-tier callers to identify their app:
        "HTTP-Referer": Deno.env.get("PUBLIC_APP_URL") ?? "https://example.com",
        "X-Title": "Call Evaluation System",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "call_evaluation", strict: true, schema },
        },
        // The capable free models are mostly reasoning models, and left to
        // themselves they spend the whole completion budget thinking: one
        // measured call put 246 of 270 completion tokens into `reasoning`
        // and returned `{"dimensions":[]}` as the actual content. We want the
        // reasoning in the `reasoning` FIELD of each dimension, where it is
        // visible to the user, not in discarded thinking tokens.
        reasoning: { enabled: false },
        // Room for a full group of dimensions with evidence and quick fixes.
        max_tokens: 8000,
        temperature: 0.2,
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new OpenRouterError(
        `Model request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        true,
      );
    }
    // Never reached the provider — always worth retrying.
    throw new OpenRouterError(
      `OpenRouter request could not be sent: ${e instanceof Error ? e.message : String(e)}`,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text();
    // 429 here is usually the shared free-tier pool, not this key's quota.
    const retryable = res.status === 429 || res.status >= 500;
    throw new OpenRouterError(
      `OpenRouter request failed (${res.status}): ${body.slice(0, 500)}`,
      retryable,
    );
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    // Seen when a model spends its whole budget on reasoning tokens, or when
    // the provider truncates. Another tick is worth a try before giving up.
    const finish = json?.choices?.[0]?.finish_reason ?? "unknown";
    throw new OpenRouterError(
      `Model returned an empty completion (finish_reason: ${finish})`,
      true,
    );
  }

  // Not every free model honors response_format cleanly — some still wrap
  // JSON in ```json fences despite instructions. Strip those before parsing
  // rather than failing the whole run over formatting.
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

  let parsed: T;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new OpenRouterError(
      "Model response did not match the expected format (invalid JSON)",
    );
  }

  return { data: parsed, model };
}
