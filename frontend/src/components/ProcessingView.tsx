import type { RunRow } from "../types";
import { STAGE_LABELS, STAGE_ORDER } from "../types";
import { extractClientName } from "../lib/clientName";

// Rich, animated processing screen. Stages are the source of truth from the
// worker; we layer a progress bar, shimmer skeletons of the report cards
// that will land here, and a pulsing chip on the active stage.
export default function ProcessingView({ run }: { run: RunRow }) {
  const currentIndex = Math.max(0, STAGE_ORDER.indexOf(run.processing_stage));
  const pct = Math.round(((currentIndex + 1) / STAGE_ORDER.length) * 100);
  const client = extractClientName(run.transcript);

  return (
    <div className="mx-auto max-w-4xl px-6 md:px-10 py-10">
      {/* Header + progress bar */}
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Evaluation · {run.call_type}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          Scoring {client}'s call
        </h1>
        <p className="mt-1 text-sm text-muted">
          You can close this tab — the evaluation continues in the background. Reopen
          this URL any time to check on it.
        </p>
      </header>

      <div className="bg-card border border-line rounded-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-muted">
            {run.status === "queued" ? "Queued" : STAGE_LABELS[run.processing_stage]}
          </span>
          <span className="text-xs font-mono text-muted tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-line/60 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-coral via-[#F5A524] to-strong transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          {run.status !== "queued" && (
            <div className="absolute inset-y-0 left-0 w-1/4 bg-white/30 slide-bar" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Stage list */}
        <div className="md:col-span-2">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted mb-4">Pipeline</p>
            <ol className="space-y-3">
              {STAGE_ORDER.map((stage, i) => {
                const done = i < currentIndex;
                const active = i === currentIndex && run.status !== "queued";
                return (
                  <li
                    key={stage}
                    className="flex items-center gap-3 text-sm rise"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold shrink-0 ${
                        done
                          ? "bg-strong text-white"
                          : active
                            ? "bg-coral text-white ring-pulse"
                            : "bg-line/60 text-muted"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={done || active ? "text-ink" : "text-muted"}>
                      {STAGE_LABELS[stage]}
                    </span>
                    {active && (
                      <span className="ml-auto text-[10px] font-mono uppercase text-coral">
                        working
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Skeleton of the incoming report — hints at what's coming */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-card border border-line rounded-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-24 w-40 rounded-lg shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded shimmer" />
                <div className="h-3 w-32 rounded shimmer" />
                <div className="h-3 w-20 rounded shimmer" />
              </div>
            </div>
          </div>
          <div className="bg-card border border-line rounded-card p-5">
            <div className="h-3 w-24 rounded shimmer mb-3" />
            <div className="h-3 w-full rounded shimmer mb-2" />
            <div className="h-3 w-11/12 rounded shimmer mb-2" />
            <div className="h-3 w-3/4 rounded shimmer" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-line rounded-card p-4 flex items-center justify-between"
              >
                <div className="h-3 w-40 rounded shimmer" />
                <div className="h-5 w-14 rounded-full shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
