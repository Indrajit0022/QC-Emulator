import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { CallType } from "../types";

export default function Home() {
  const navigate = useNavigate();
  const [callType, setCallType] = useState<CallType>("kickoff");
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEvaluate() {
    if (!transcript.trim()) {
      setError("Paste a transcript first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("runs")
      .insert({ call_type: callType, transcript })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not start the evaluation.");
      setSubmitting(false);
      return;
    }

    navigate(`/run/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-mono text-xs uppercase tracking-widest text-muted">
        Call evaluation
      </h1>
      <p className="mt-2 text-2xl font-semibold text-ink">
        Paste a transcript, get a scored, evidence-backed report.
      </p>

      <div className="mt-10 bg-card border border-line rounded-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Call type</label>
          <div className="flex gap-2">
            {(["kickoff", "coaching"] as CallType[]).map((t) => (
              <button
                key={t}
                onClick={() => setCallType(t)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  callType === t
                    ? "border-coral bg-coral-bg text-coral-text"
                    : "border-line text-muted hover:bg-paper"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Transcript</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="[Coach]: What would you like to achieve?&#10;[Client]: I want to grow my team."
            rows={14}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        {error && <p className="text-sm text-weak-text">{error}</p>}

        <button
          onClick={handleEvaluate}
          disabled={submitting}
          className="w-full rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Evaluate call"}
        </button>
      </div>
    </div>
  );
}
