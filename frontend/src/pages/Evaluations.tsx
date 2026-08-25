import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { RunRow } from "../types";
import { extractClientName, extractCoachName } from "../lib/clientName";
import { gradeTokens } from "../lib/grade";

export default function Evaluations() {
  const [rows, setRows] = useState<RunRow[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get("q") ?? "");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchRows = useCallback(() => {
    supabase
      .from("runs")
      .select("id, call_type, status, processing_stage, transcript, coach_name, client_name, deleted_at, total_score, max_score, grade, report, error, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data as RunRow[]) ?? []));
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setLocalSearch(q);
  }, [searchParams]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    setConfirmId(null);
    await supabase.from("runs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setDeletingId(null);
  }

  const query = localSearch.trim().toLowerCase();
  const filtered = rows?.filter((r) => {
    if (!query) return true;
    const client = (r.client_name ?? extractClientName(r.transcript)).toLowerCase();
    const coach = (r.coach_name ?? extractCoachName(r.transcript) ?? "").toLowerCase();
    const brief = (r.report?.brief ?? "").toLowerCase();
    const type = r.call_type.toLowerCase();
    const grade = (r.grade ?? "").toLowerCase();
    return client.includes(query) || coach.includes(query) || brief.includes(query) || type.includes(query) || grade.includes(query);
  });

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalSearch(val);
    if (val.trim()) {
      setSearchParams({ q: val.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10 py-10">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted dark:text-dark-muted">
            Evaluations
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink dark:text-dark-ink">
            Past runs
            {rows !== null && (
              <span className="ml-2 text-base font-normal text-muted dark:text-dark-muted">
                ({rows.length})
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted dark:text-dark-muted pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              placeholder="Filter by name, grade…"
              className="
                pl-8 pr-3 py-2 text-sm rounded-xl w-52
                bg-card/80 dark:bg-dark-card/80 backdrop-blur-sm
                border border-line/50 dark:border-dark-line/50
                text-ink dark:text-dark-ink placeholder:text-muted dark:placeholder:text-dark-muted
                focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral/40
                transition-all
              "
            />
            {localSearch && (
              <button
                onClick={() => { setLocalSearch(""); setSearchParams({}, { replace: true }); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <Link
            to="/"
            className="shrink-0 text-sm font-medium rounded-xl bg-coral text-white px-4 py-2 hover:bg-coral/90 hover:shadow-glow transition-all duration-200"
          >
            + New evaluation
          </Link>
        </div>
      </header>

      {/* States */}
      {rows === null && <SkeletonList />}

      {rows !== null && rows.length === 0 && (
        <div className="glass-card rounded-card border-dashed p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-paper/80 dark:bg-dark-surface/80 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-muted dark:text-dark-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
              <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-muted dark:text-dark-muted font-medium">No evaluations yet</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Run your first one from the sidebar.</p>
        </div>
      )}

      {filtered !== undefined && filtered !== null && rows !== null && rows.length > 0 && (
        <>
          {query && (
            <p className="text-xs text-muted dark:text-dark-muted mb-3">
              {filtered.length === 0 ? "No matches" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`} for "{localSearch}"
            </p>
          )}
          {filtered.length === 0 && query ? (
            <div className="glass-card rounded-card border-dashed p-10 text-center text-muted dark:text-dark-muted text-sm">
              No evaluations match your search.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((r) => (
                <EvalRow
                  key={r.id}
                  run={r}
                  confirmId={confirmId}
                  deletingId={deletingId}
                  onRequestDelete={(id) => setConfirmId(id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onConfirmDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function EvalRow({
  run,
  confirmId,
  deletingId,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  run: RunRow;
  confirmId: string | null;
  deletingId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
}) {
  const client = run.client_name ?? extractClientName(run.transcript);
  const coach = run.coach_name ?? extractCoachName(run.transcript);
  const grade = gradeTokens(run.grade);
  const brief = run.report?.brief;
  const when = new Date(run.created_at).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
  const isConfirming = confirmId === run.id;
  const isDeleting = deletingId === run.id;
  const callLabel = run.call_type === "kickoff" ? "Kick-off" : "Coaching";

  return (
    <li
      className={`
        group glass-card glow-border rounded-card
        transition-all duration-300
        ${isDeleting ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"}
        ${isConfirming ? "!border-coral/30" : "hover:shadow-glass-lg hover:scale-[1.002]"}
      `}
    >
      <div className="flex items-start gap-2 p-5">
        <Link to={`/run/${run.id}`} className="block flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-ink dark:text-dark-ink truncate">{client}</h3>
                {coach && (
                  <span className="text-xs text-muted dark:text-dark-muted">
                    coached by {coach}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted dark:text-dark-muted">
                <span>{when}</span>
                <span className="text-line dark:text-dark-line">·</span>
                <span className={`font-medium px-2 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
                  {callLabel}
                </span>
              </div>
              {brief ? (
                <p className="mt-2 text-sm text-muted dark:text-dark-muted line-clamp-2 leading-relaxed">{brief}</p>
              ) : (
                <p className="mt-2 text-sm text-muted dark:text-dark-muted italic">
                  {run.status === "completed" ? "No brief." : `Status: ${run.status}`}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {run.status === "completed" && run.total_score !== null && (
                <>
                  <div className="text-2xl font-semibold text-ink dark:text-dark-ink tabular-nums leading-none">
                    {run.total_score}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted dark:text-dark-muted mt-0.5">
                    of {run.max_score}
                  </div>
                  {run.grade && (
                    <span className={`mt-1.5 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
                      {run.grade}
                    </span>
                  )}
                </>
              )}
              {run.status === "failed" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-weak-bg dark:bg-dark-weak-bg text-weak-text dark:text-dark-weak-text">
                  failed
                </span>
              )}
              {(run.status === "queued" || run.status === "processing") && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral-bg dark:bg-dark-coral-bg text-coral-text dark:text-dark-coral-text ring-pulse">
                  {run.status}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="shrink-0 flex items-center gap-1 ml-1 mt-0.5">
          {isConfirming ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <span className="text-xs text-muted dark:text-dark-muted font-medium whitespace-nowrap">Delete?</span>
              <button
                onClick={() => onConfirmDelete(run.id)}
                className="text-xs font-medium text-white bg-coral rounded-lg px-2.5 py-1 hover:bg-coral/90 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={onCancelDelete}
                className="text-xs font-medium text-ink dark:text-dark-ink bg-paper/80 dark:bg-dark-surface border border-line/50 dark:border-dark-line/50 rounded-lg px-2.5 py-1 hover:bg-line/30 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); onRequestDelete(run.id); }}
              title="Delete evaluation"
              className="
                h-7 w-7 rounded-lg flex items-center justify-center
                text-muted dark:text-dark-muted
                opacity-0 group-hover:opacity-100
                hover:text-coral hover:bg-coral/10 dark:hover:bg-coral/10
                transition-all
              "
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="glass-card rounded-card p-5">
          <div className="flex justify-between gap-4">
            <div className="flex-1">
              <div className="h-4 w-36 rounded-lg shimmer mb-3" />
              <div className="h-3 w-full rounded-lg shimmer mb-2" />
              <div className="h-3 w-3/4 rounded-lg shimmer" />
            </div>
            <div className="w-16">
              <div className="h-7 w-12 rounded-lg shimmer mb-1" />
              <div className="h-3 w-10 rounded-lg shimmer" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" />
    </svg>
  );
}
