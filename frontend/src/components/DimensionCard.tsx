import { useState } from "react";
import type { DimensionRow } from "../types";

export default function DimensionCard({
  dim,
  index,
  last,
}: {
  dim: DimensionRow;
  index?: number;
  last?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = dim.max_score > 0 ? (dim.score ?? 0) / dim.max_score : 0;
  const scoreColor =
    pct >= 0.75
      ? "bg-strong-bg dark:bg-dark-strong-bg text-strong-text dark:text-dark-strong-text"
      : pct >= 0.5
        ? "bg-[#FFF3E7] dark:bg-[#2A1F00] text-[#8A4B00] dark:text-[#FBB740]"
        : "bg-weak-bg dark:bg-dark-weak-bg text-weak-text dark:text-dark-weak-text";

  return (
    <div className={last ? "" : "border-b border-line/30 dark:border-dark-line/30"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper/40 dark:hover:bg-dark-surface/40 transition-all duration-200"
      >
        {/* Index number */}
        {index !== undefined && (
          <span className="text-sm font-medium text-muted dark:text-dark-muted tabular-nums shrink-0 w-6 text-center">
            {index}
          </span>
        )}

        {/* Score bar indicator */}
        <div className="shrink-0 w-1 h-8 rounded-full overflow-hidden bg-line dark:bg-dark-line">
          <div
            className={`w-full rounded-full transition-all duration-500 ${
              pct >= 0.75 ? "bg-strong" : pct >= 0.5 ? "bg-[#F59E0B]" : "bg-coral"
            }`}
            style={{ height: `${Math.round(pct * 100)}%`, marginTop: `${100 - Math.round(pct * 100)}%` }}
          />
        </div>

        {/* Name + hint */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink dark:text-dark-ink truncate">
            {dim.dimension_name}
            {!dim.is_applicable && (
              <span className="ml-2 text-xs text-muted dark:text-dark-muted font-normal">(not applicable)</span>
            )}
          </div>
          <div className="text-xs text-muted dark:text-dark-muted mt-0.5 truncate">{oneLineHint(dim.reasoning)}</div>
        </div>

        {/* Score badge */}
        <span className={`font-mono text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${scoreColor}`}>
          {dim.score ?? 0}/{dim.max_score}
        </span>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 text-muted dark:text-dark-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 bg-paper/30 dark:bg-dark-paper/30 backdrop-blur-sm border-t border-line/20 dark:border-dark-line/20">
          {dim.reasoning && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-1.5">Reasoning</p>
              <p className="text-sm text-ink dark:text-dark-ink leading-relaxed">{dim.reasoning}</p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-1.5">Evidence from transcript</p>
            {dim.evidence.length === 0 ? (
              <p className="text-sm text-muted dark:text-dark-muted italic">No transcript evidence found.</p>
            ) : (
              <div className="bg-paper/60 dark:bg-dark-paper/60 backdrop-blur-sm border border-line/30 dark:border-dark-line/30 rounded-card p-4 space-y-3">
                {dim.evidence.map((e, i) => (
                  <div key={i} className="text-sm leading-relaxed flex gap-2">
                    <span className="text-coral shrink-0 mt-0.5">❝</span>
                    <div>
                      <span className="font-semibold text-ink dark:text-dark-ink">{e.speaker}:</span>{" "}
                      <span className="text-ink/80 dark:text-dark-ink/80 italic">"{e.quote}"</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {dim.quick_fix && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-1.5">Quick fix</p>
              <div className="flex gap-2">
                <span className="text-coral shrink-0 mt-0.5">→</span>
                <p className="text-sm text-ink dark:text-dark-ink leading-relaxed">{dim.quick_fix}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function oneLineHint(reasoning: string | null): string {
  if (!reasoning) return "";
  const firstSentence = reasoning.split(/[.!?]/)[0].trim();
  if (!firstSentence) return "";
  if (firstSentence.length <= 90) return firstSentence + ".";
  return firstSentence.slice(0, 87) + "…";
}
