import type { BuiltPrompt } from "./prompt-builder.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Set via `supabase secrets set OPENROUTER_MODEL=...`. Pick a free model with
// a large context window and JSON/structured-output support — check
// https://openrouter.ai/models?supported_parameters=tools with the :free
// filter, since the free lineup rotates. Default below is a placeholder;
// override with the secret rather than editing code when the model changes.
const DEFAULT_MODEL = "qwen/qwen3-coder:free";

export class OpenRouterError extends Error {}

export async function callOpenRouterForJson<T>(
  prompt: BuiltPrompt,
  schema: Record<string, unknown>,
  // Optional override. Supplied by the worker when the key lives in Vault
  // rather than in an Edge Function secret (see resolveOpenRouterKey).
  apiKeyOverride?: string,
  modelOverride?: string,
): Promise<{ data: T; model: string }> {
  const apiKey = apiKeyOverride ?? Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new OpenRouterError("OPENROUTER_API_KEY is not set");
  const model = modelOverride ?? Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_MODEL;

  const res = await fetch(OPENROUTER_URL, {
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
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OpenRouterError(
      `OpenRouter request failed (${res.status}): ${body.slice(0, 500)}`,
    );
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("OpenRouter response had no message content");
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
