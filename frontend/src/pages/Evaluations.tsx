import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { RunRow } from "../types";
import { extractClientName } from "../lib/clientName";
import { gradeTokens } from "../lib/grade";

// Past runs. Per the brief, we only show the client name (derived from the
// transcript) and the summary brief — no fake fields.
export default function Evaluations() {
  const [rows, setRows] = useState<RunRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("runs")
      .select("id, call_type, status, processing_stage, transcript, total_score, max_score, grade, report, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data as RunRow[]) ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Evaluations</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Past runs</h1>
        </div>
        <Link
          to="/"
          className="text-sm font-medium rounded-full bg-ink text-paper px-4 py-2 hover:bg-ink/90"
        >
          + New evaluation
        </Link>
      </header>

      {rows === null && <SkeletonList />}
      {rows && rows.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-card p-10 text-center text-muted">
          No evaluations yet. Run your first one from the sidebar.
        </div>
      )}
      {rows && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => (
            <EvalRow key={r.id} run={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EvalRow({ run }: { run: RunRow }) {
  const client = extractClientName(run.transcript);
  const grade = gradeTokens(run.grade);
  const brief = run.report?.brief;
  const when = new Date(run.created_at).toLocaleString();

  return (
    <li className="bg-card border border-line rounded-card p-5 hover:shadow-sm transition-shadow">
      <Link to={`/run/${run.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink truncate">{client}</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted">
                · {run.call_type}
              </span>
            </div>
            {brief ? (
              <p className="mt-2 text-sm text-muted line-clamp-2">{brief}</p>
            ) : (
              <p className="mt-2 text-sm text-muted italic">
                {run.status === "completed" ? "No brief." : `Status: ${run.status}`}
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted">{when}</p>
          </div>

          {run.status === "completed" && run.total_score !== null && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-semibold text-ink tabular-nums leading-none">
                {run.total_score}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted mt-1">
                of {run.max_score}
              </div>
              {run.grade && (
                <span className={`mt-2 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
                  {run.grade}
                </span>
              )}
            </div>
          )}
          {run.status === "failed" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-weak-bg text-weak-text shrink-0">
              failed
            </span>
          )}
          {(run.status === "queued" || run.status === "processing") && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral-bg text-coral-text shrink-0 ring-pulse">
              {run.status}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="bg-card border border-line rounded-card p-5">
          <div className="h-4 w-40 rounded shimmer mb-3" />
          <div className="h-3 w-full rounded shimmer mb-2" />
          <div className="h-3 w-3/4 rounded shimmer" />
        </li>
      ))}
    </ul>
  );
}
