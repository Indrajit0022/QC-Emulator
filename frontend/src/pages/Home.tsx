import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { CallType } from "../types";

type CardDef = {
  id: CallType;
  title: string;
  blurb: string;
  tint: string;
  darkTint: string;
  ink: string;
  darkInk: string;
  icon: JSX.Element;
};

const CARDS: CardDef[] = [
  {
    id: "kickoff",
    title: "Kick-off call",
    blurb: "Evaluate onboarding, alignment, and expectation setting.",
    tint: "bg-[#FFF3E7]",
    darkTint: "dark:bg-[#2A1A00]",
    ink: "text-[#D97706]",
    darkInk: "dark:text-[#FBB740]",
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
    darkTint: "dark:bg-[#0E2417]",
    ink: "text-[#2F8F4E]",
    darkInk: "dark:text-[#4ADE80]",
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
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-1">
          QC Evaluator
        </p>
        <h1 className="text-[28px] font-semibold text-ink dark:text-dark-ink">Run an evaluation</h1>
        <p className="mt-1.5 text-sm text-muted dark:text-dark-muted max-w-lg leading-relaxed">
          Choose the call type and paste the transcript to get a scored, evidence-backed report.
        </p>
      </header>

      {/* ── Call type cards ─────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink dark:text-dark-ink uppercase tracking-wide mb-1">
          1 — Choose call type
        </h2>
        <p className="text-xs text-muted dark:text-dark-muted mb-4">Select the type of call you want to evaluate.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((c) => {
            const active = callType === c.id;
            return (
              <div
                key={c.id}
                className={`
                  rounded-card border bg-card dark:bg-dark-card p-6 flex flex-col transition-all duration-200 cursor-pointer
                  ${active
                    ? "border-coral shadow-lg shadow-coral/10 ring-2 ring-coral/20"
                    : "border-line dark:border-dark-line hover:border-muted dark:hover:border-dark-muted hover:shadow-md"
                  }
                `}
                onClick={() => pickType(c.id)}
              >
                <div className={`h-14 w-14 rounded-2xl ${c.tint} ${c.darkTint} flex items-center justify-center ${c.ink} ${c.darkInk} mb-4`}>
                  {c.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-ink dark:text-dark-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted dark:text-dark-muted flex-1 leading-relaxed">{c.blurb}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); pickType(c.id); }}
                  className={`
                    mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition-all
                    ${active
                      ? "bg-coral text-white shadow-md shadow-coral/20"
                      : "bg-ink dark:bg-dark-surface text-white dark:text-dark-ink hover:bg-ink/90 dark:hover:bg-dark-line"
                    }
                  `}
                >
                  {active ? "✓ Selected" : "Select"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Transcript ─────────────────────────────────────────── */}
      {callType && (
        <section ref={transcriptRef}>
          <h2 className="text-sm font-semibold text-ink dark:text-dark-ink uppercase tracking-wide mb-1">
            2 — Paste transcript
          </h2>
          <p className="text-xs text-muted dark:text-dark-muted mb-4">
            Format:{" "}
            <code className="font-mono bg-paper dark:bg-dark-surface px-1.5 py-0.5 rounded text-ink dark:text-dark-ink border border-line dark:border-dark-line">
              [Speaker]: text
            </code>{" "}
            — one turn per line.
          </p>

          <div className="bg-card dark:bg-dark-card border border-line dark:border-dark-line rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-widest text-muted dark:text-dark-muted font-mono">
                {CARDS.find((c) => c.id === callType)?.title}
              </span>
              <span className={`text-[11px] tabular-nums font-mono ${
                transcript.length > 0 ? "text-ink dark:text-dark-ink" : "text-muted dark:text-dark-muted"
              }`}>
                {transcript.length.toLocaleString()} chars
              </span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={"[Coach]: What would you like to achieve?\n[Client]: I want to grow my team."}
              rows={14}
              className="
                w-full rounded-xl border border-line dark:border-dark-line
                bg-paper dark:bg-dark-paper
                px-4 py-3 font-mono text-sm
                text-ink dark:text-dark-ink
                placeholder:text-muted dark:placeholder:text-dark-muted
                focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50
                resize-y transition-all
              "
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-coral">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={handleEvaluate}
                disabled={submitting}
                className="
                  rounded-xl bg-coral text-white px-7 py-2.5 text-sm font-semibold
                  hover:bg-coral/90 disabled:opacity-50 flex items-center gap-2.5
                  shadow-md shadow-coral/20 transition-all
                "
              >
                {submitting && (
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                {submitting ? "Starting…" : "Evaluate call →"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
