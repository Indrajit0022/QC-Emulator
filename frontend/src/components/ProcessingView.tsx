import type { RunRow } from "../types";
import { STAGE_LABELS, STAGE_ORDER } from "../types";

export default function ProcessingView({ run }: { run: RunRow }) {
  const currentIndex = STAGE_ORDER.indexOf(run.processing_stage);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        Evaluation #{run.id.slice(0, 8)}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">
        {run.status === "queued" ? "Queued" : "Processing"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        You can safely close this page — your evaluation will continue in the
        background. Reopen this URL any time to check on it.
      </p>

      <div className="mt-8 bg-card border border-line rounded-card p-5">
        <ol className="space-y-3">
          {STAGE_ORDER.map((stage, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={stage} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    done
                      ? "bg-strong-bg text-strong-text"
                      : active
                        ? "bg-coral-bg text-coral-text"
                        : "bg-line/40 text-muted"
                  }`}
                >
                  {done ? "✓" : active ? "…" : ""}
                </span>
                <span className={done || active ? "text-ink" : "text-muted"}>
                  {STAGE_LABELS[stage]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
