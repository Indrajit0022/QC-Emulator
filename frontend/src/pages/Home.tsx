import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { CallType } from "../types";

type CardDef = {
  id: CallType;
  title: string;
  blurb: string;
  tint: string; // pastel bg for the circular icon
  ink: string; // icon stroke color
  icon: JSX.Element;
};

const CARDS: CardDef[] = [
  {
    id: "kickoff",
    title: "Kick-off call",
    blurb: "Evaluate onboarding, alignment, and expectation setting.",
    tint: "bg-[#FFF3E7]",
    ink: "text-[#D97706]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M4.5 16.5c-1 1.5-1 4 0 5 1 1 3.5 1 5 0M14 9l-3-3M9 13l-1 1-3-3 1-1M15 4l5 5-9 9-5-5 9-9zM14 4l6 6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "coaching",
    title: "Coaching call",
    blurb: "Evaluate coaching techniques, listening, and guidance.",
    tint: "bg-[#E8F6EC]",
    ink: "text-[#2F8F4E]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M4 5h16v11H7l-3 3V5z" strokeLinejoin="round" />
        <path d="M8 10h6M8 13h4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [callType, setCallType] = useState<CallType | null>(null);
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  function pickType(t: CallType) {
    setCallType(t);
    setError(null);
    setTimeout(() => transcriptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function handleEvaluate() {
    if (!callType) return;
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
    <div className="mx-auto max-w-4xl px-6 md:px-12 py-10">
      <header className="mb-2">
        <h1 className="text-[26px] font-semibold text-ink">Run an evaluation</h1>
        <p className="mt-1 text-sm text-muted">
          Choose the call type and paste the transcript to get a scored, evidence-backed report.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink">Choose call type</h2>
        <p className="mt-1 text-sm text-muted">Select the type of call you want to evaluate.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((c) => {
            const active = callType === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-card border bg-card p-5 flex flex-col transition-all ${
                  active ? "border-coral shadow-sm ring-2 ring-coral/20" : "border-line"
                }`}
              >
                <div className={`h-14 w-14 rounded-full ${c.tint} flex items-center justify-center ${c.ink}`}>
                  {c.icon}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted flex-1">{c.blurb}</p>
                <button
                  onClick={() => pickType(c.id)}
                  className={`mt-4 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-coral text-white hover:bg-coral/90"
                      : "bg-ink text-white hover:bg-ink/90"
                  }`}
                >
                  {active ? "Selected" : "Run"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {callType && (
        <section ref={transcriptRef} className="mt-8">
          <h2 className="text-base font-semibold text-ink">Transcript</h2>
          <p className="mt-1 text-sm text-muted">
            Formatted as <code className="text-ink">[Speaker]: text</code> — one turn per line.
          </p>

          <div className="mt-4 bg-card border border-line rounded-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest text-muted">
                {CARDS.find((c) => c.id === callType)?.title}
              </span>
              <span className="text-[11px] text-muted tabular-nums">
                {transcript.length.toLocaleString()} chars
              </span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="[Coach]: What would you like to achieve?&#10;[Client]: I want to grow my team."
              rows={14}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral resize-y"
            />
            {error && <p className="mt-3 text-sm text-weak-text">{error}</p>}
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={handleEvaluate}
                disabled={submitting}
                className="rounded-lg bg-ink text-white px-6 py-2.5 text-sm font-medium hover:bg-ink/90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                {submitting ? "Starting…" : "Evaluate call"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
