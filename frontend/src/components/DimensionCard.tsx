import { useState } from "react";
import type { DimensionRow } from "../types";

export default function DimensionCard({ dim }: { dim: DimensionRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-line rounded-md bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-ink">
          {dim.dimension_name}
          {!dim.is_applicable && (
            <span className="ml-2 text-xs text-muted">(not applicable)</span>
          )}
        </span>
        <span className="font-mono text-sm text-ink">
          {dim.score ?? 0} / {dim.max_score}
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-4 py-3 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">
              Reasoning
            </p>
            <p className="mt-1 text-ink">{dim.reasoning || "—"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted">
              Evidence
            </p>
            {dim.evidence.length === 0 ? (
              <p className="mt-1 text-muted italic">
                No transcript evidence found.
              </p>
            ) : (
              <ul className="mt-1 space-y-1">
                {dim.evidence.map((e, i) => (
                  <li key={i} className="font-mono text-xs text-ink">
                    <span className="text-muted">[{e.speaker}]</span>{" "}
                    <span className="bg-highlight/40">"{e.quote}"</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {dim.quick_fix && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                Quick fix
              </p>
              <p className="mt-1 text-ink">{dim.quick_fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
