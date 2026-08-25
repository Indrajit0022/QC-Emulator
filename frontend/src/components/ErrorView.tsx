import { Link, useNavigate } from "react-router-dom";
import type { RunRow } from "../types";

export default function ErrorView({ run }: { run: RunRow }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-10 py-10">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M3 12l9-9 9 9M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-weak-text">Evaluation failed</h1>
      <p className="mt-2 text-sm text-muted">We couldn't complete this evaluation.</p>

      <div className="mt-6 bg-weak-bg border border-line rounded-card p-4">
        <p className="text-xs uppercase tracking-widest text-weak-text">Reason</p>
        <p className="mt-1 font-mono text-sm text-ink">{run.error ?? "Unknown error."}</p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Try again
        </button>
        <Link
          to="/evaluations"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-line/30"
        >
          View past evaluations
        </Link>
      </div>
    </div>
  );
}
