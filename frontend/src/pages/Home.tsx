import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { CallType } from "../types";

const CALL_TYPES: { id: CallType; title: string; blurb: string; icon: JSX.Element }[] = [
  {
    id: "kickoff",
    title: "Kick-off call",
    blurb: "First conversation. Goals, deep why, agreements, recap.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 2v6M4.9 4.9l4.2 4.2M2 12h6M4.9 19.1l4.2-4.2M12 22v-6M19.1 19.1l-4.2-4.2M22 12h-6M19.1 4.9l-4.2 4.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "coaching",
    title: "Coaching call",
    blurb: "Ongoing session. Vision, action steps, struggles, next call.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M4 4h16v12H5.5L4 17.5V4z" strokeLinejoin="round" />
        <path d="M8 9h8M8 12h5" strokeLinecap="round" />
      </svg>
    ),
  },
];

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
    <div className="mx-auto max-w-4xl px-6 md:px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Run evaluation</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          Paste a transcript, get a scored, evidence-backed report.
        </h1>
      </header>

      {/* Call-type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {CALL_TYPES.map((c) => {
          const active = callType === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCallType(c.id)}
              className={`text-left rounded-card border p-5 transition-all ${
                active
                  ? "border-coral bg-coral-bg/60 shadow-sm"
                  : "border-line bg-card hover:border-muted/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    active ? "bg-coral text-white" : "bg-paper text-muted"
                  }`}
                >
                  {c.icon}
                </div>
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    active ? "border-coral bg-coral" : "border-line bg-white"
                  }`}
                />
              </div>
              <h3 className={`mt-4 text-base font-semibold ${active ? "text-coral-text" : "text-ink"}`}>
                {c.title}
              </h3>
              <p className={`mt-1 text-sm ${active ? "text-coral-text/80" : "text-muted"}`}>
                {c.blurb}
              </p>
            </button>
          );
        })}
      </div>

      {/* Transcript */}
      <div className="bg-card border border-line rounded-card p-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-ink">Transcript</label>
          <span className="text-[11px] text-muted tabular-nums">
            {transcript.length.toLocaleString()} chars
          </span>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="[Coach]: What would you like to achieve?&#10;[Client]: I want to grow my team."
          rows={16}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral resize-y"
        />

        {error && <p className="mt-3 text-sm text-weak-text">{error}</p>}

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] text-muted">
            Formatted as <code className="text-ink">[Speaker]: text</code> — one turn per line.
          </p>
          <button
            onClick={handleEvaluate}
            disabled={submitting}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && (
              <span className="h-3 w-3 rounded-full border-2 border-paper border-t-transparent animate-spin" />
            )}
            {submitting ? "Starting…" : "Evaluate call"}
          </button>
        </div>
      </div>
    </div>
  );
}
