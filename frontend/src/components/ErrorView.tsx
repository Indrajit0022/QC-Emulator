import { Link, useNavigate } from "react-router-dom";
import type { RunRow } from "../types";

export default function ErrorView({ run }: { run: RunRow }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-10 py-16">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>
      </div>

      {/* Error hero */}
      <div className="bg-card dark:bg-dark-card border border-coral/20 rounded-card p-8 mb-6">
        <div className="h-12 w-12 rounded-full bg-coral-bg dark:bg-dark-coral-bg flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink dark:text-dark-ink">Evaluation failed</h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">We couldn't complete this evaluation.</p>

        <div className="mt-5 bg-paper dark:bg-dark-paper border border-line dark:border-dark-line rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-1.5">Error details</p>
          <p className="font-mono text-sm text-ink dark:text-dark-ink break-all">
            {run.error ?? "Unknown error."}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral/90 transition-colors shadow-md shadow-coral/20"
        >
          Try again
        </button>
        <Link
          to="/evaluations"
          className="rounded-xl border border-line dark:border-dark-line px-5 py-2.5 text-sm font-medium text-ink dark:text-dark-ink hover:bg-paper dark:hover:bg-dark-surface transition-colors"
        >
          View past evaluations
        </Link>
      </div>
    </div>
  );
}
