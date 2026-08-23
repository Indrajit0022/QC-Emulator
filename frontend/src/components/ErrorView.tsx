import { useNavigate } from "react-router-dom";
import type { RunRow } from "../types";

export default function ErrorView({ run }: { run: RunRow }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-weak">Evaluation failed</h1>
      <p className="mt-2 text-sm text-muted">
        We couldn't complete this evaluation.
      </p>
      <div className="mt-6 rounded-md border border-line bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-muted">Reason</p>
        <p className="mt-1 font-mono text-sm text-ink">
          {run.error ?? "Unknown error."}
        </p>
      </div>
      <button
        onClick={() => navigate("/")}
        className="mt-6 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
      >
        Try Again
      </button>
    </div>
  );
}
