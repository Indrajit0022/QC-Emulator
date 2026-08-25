import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { CallType } from "../types";

type CardDef = {
  id: CallType;
  title: string;
  blurb: string;
  icon: JSX.Element;
  gradient: string;
  darkGradient: string;
};

const CARDS: CardDef[] = [
  {
    id: "kickoff",
    title: "Kick-off call",
    blurb: "Evaluate onboarding, alignment, and expectation setting.",
    gradient: "from-amber-500/10 to-orange-500/5",
    darkGradient: "dark:from-amber-500/5 dark:to-orange-500/3",
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
    gradient: "from-emerald-500/10 to-green-500/5",
    darkGradient: "dark:from-emerald-500/5 dark:to-green-500/3",
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
      {/* Header */}
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-1">
          QC Evaluator
        </p>
        <h1 className="text-[28px] font-semibold text-ink dark:text-dark-ink">Run an evaluation</h1>
        <p className="mt-1.5 text-sm text-muted dark:text-dark-muted max-w-lg leading-relaxed">
          Choose the call type and paste the transcript to get a scored, evidence-backed report.
        </p>
      </header>

      {/* Call type cards */}
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
                  rounded-card glass-card glow-border p-6 flex flex-col cursor-pointer
                  bg-gradient-to-br ${c.gradient} ${c.darkGradient}
                  transition-all duration-300
                  ${active
                    ? "!border-coral/40 dark:!border-coral/30 shadow-glow scale-[1.01]"
                    : "hover:shadow-glass-lg hover:scale-[1.005]"
                  }
                `}
                onClick={() => pickType(c.id)}
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-colors
                  ${active
                    ? "bg-coral/10 dark:bg-coral/15 text-coral"
                    : "bg-ink/5 dark:bg-white/5 text-ink/60 dark:text-dark-ink/60"
                  }
                `}>
                  {c.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-ink dark:text-dark-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted dark:text-dark-muted flex-1 leading-relaxed">{c.blurb}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); pickType(c.id); }}
                  className={`
                    mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200
                    ${active
                      ? "bg-coral text-white shadow-md shadow-coral/20"
                      : "bg-ink/90 dark:bg-dark-surface text-white dark:text-dark-ink hover:bg-ink dark:hover:bg-dark-line border border-transparent dark:border-dark-line/50"
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

      {/* Transcript */}
      {callType && (
        <section ref={transcriptRef} className="animate-slide-up">
          <h2 className="text-sm font-semibold text-ink dark:text-dark-ink uppercase tracking-wide mb-1">
            2 — Paste transcript
          </h2>
          <p className="text-xs text-muted dark:text-dark-muted mb-4">
            Format:{" "}
            <code className="font-mono bg-paper/80 dark:bg-dark-surface/80 px-1.5 py-0.5 rounded-lg text-ink dark:text-dark-ink border border-line/50 dark:border-dark-line/50">
              [Speaker]: text
            </code>{" "}
            — one turn per line.
          </p>

          <div className="glass-card rounded-card p-5">
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
                w-full rounded-xl border border-line/50 dark:border-dark-line/50
                bg-paper/50 dark:bg-dark-paper/50
                px-4 py-3 font-mono text-sm
                text-ink dark:text-dark-ink
                placeholder:text-muted dark:placeholder:text-dark-muted
                focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral/40
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
                  hover:bg-coral/90 hover:shadow-glow disabled:opacity-50 flex items-center gap-2.5
                  shadow-md shadow-coral/15 transition-all duration-200
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
