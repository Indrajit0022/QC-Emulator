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

    // This is just a DB insert — no LLM call happens on the client, so
    // it's instant and safe even if the tab closes a moment later.
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
      <h1 className="font-mono text-sm uppercase tracking-widest text-muted">
        Call Evaluation
      </h1>
      <p className="mt-2 text-2xl font-semibold text-ink">
        Paste a transcript, get a scored, evidence-backed report.
      </p>

      <div className="mt-10 space-y-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Call type
          </label>
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value as CallType)}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-highlight"
          >
            <option value="kickoff">Kick-off</option>
            <option value="coaching">Coaching</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Transcript
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="[Coach]: What would you like to achieve?&#10;[Client]: I want to grow my team."
            rows={14}
            className="w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-highlight"
          />
        </div>

        {error && <p className="text-sm text-weak">{error}</p>}

        <button
          onClick={handleEvaluate}
          disabled={submitting}
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Evaluate Call"}
        </button>
      </div>
    </div>
  );
}
