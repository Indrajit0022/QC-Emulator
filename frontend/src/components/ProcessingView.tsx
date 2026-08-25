import { useEffect, useState } from "react";
import type { RunRow } from "../types";
import { STAGE_LABELS, STAGE_ORDER } from "../types";
import { extractClientName } from "../lib/clientName";

const STAGE_SUBTITLE: Record<string, string> = {
  created: "Handing your transcript to the queue.",
  loading_rubric: "Loading the 12-dimension rubric.",
  processing_transcript: "Splitting the transcript into speaker turns.",
  extracting_evidence: "Picking candidate quotes for each dimension.",
  scoring_dimensions: "Scoring dimensions in small groups.",
  applying_rules: "Applying caps, buckets, and normalization.",
  building_report: "Writing the coach-facing summary.",
  completed: "Done.",
};

const TIPS: { icon: string; title: string; body: string }[] = [
  { icon: "🎯", title: "Ask one, then wait", body: "One open question, then a full 3-second silence — the client often fills the pause with what they actually mean." },
  { icon: "🔎", title: "Name the deep why", body: "Push past the first goal. \"Why does that matter to you?\" — twice — usually surfaces the real driver." },
  { icon: "🧭", title: "Set the North Star", body: "Start every call by naming the one outcome you're both trying to move today." },
  { icon: "🪞", title: "Reflect, don't rescue", body: "When they get stuck, mirror what you heard back to them before offering a way out." },
  { icon: "📌", title: "Close with a recap", body: "End with: what we agreed, who does what by when, and when we meet next." },
  { icon: "🧱", title: "Concrete action steps", body: "\"Try harder\" isn't an action step. \"Send the draft by Thursday\" is." },
  { icon: "🎧", title: "Talk-time under 40%", body: "The best coaching calls have the client talking most of the time — track it." },
  { icon: "🕳️", title: "Sit with the struggle", body: "When they name a real obstacle, don't jump to fix. Ask: \"What have you already tried?\"" },
  { icon: "🔁", title: "Book the next call", body: "Never end without a specific next-call slot on the calendar — momentum dies in gaps." },
  { icon: "✍️", title: "Evidence beats vibes", body: "Every score in this report is tied to a literal quote from your call. No quote, no score." },
];

export default function ProcessingView({ run }: { run: RunRow }) {
  const currentIndex = Math.max(0, STAGE_ORDER.indexOf(run.processing_stage));
  const currentStage = STAGE_ORDER[currentIndex];
  const pct = Math.round(((currentIndex + 1) / STAGE_ORDER.length) * 100);
  const client = extractClientName(run.transcript);

  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => {
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);
  const tip = TIPS[tipIdx];

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-10">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted dark:text-dark-muted">
          Evaluation · {run.call_type}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink dark:text-dark-ink">
          Scoring {client}'s call
        </h1>
        <p className="mt-2 text-sm text-muted dark:text-dark-muted max-w-md mx-auto leading-relaxed">
          You can close this tab — the evaluation continues in the background.
          Reopen this URL any time to check on it.
        </p>
      </header>

      {/* ── Current step card ──────────────────────────────────── */}
      <div className="glass-card rounded-card p-8 mb-4 relative overflow-hidden">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-widest text-muted dark:text-dark-muted">
            Step {currentIndex + 1} of {STAGE_ORDER.length}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <SpinnerDot />
            <h2 className="text-2xl font-semibold text-ink dark:text-dark-ink">
              {STAGE_LABELS[currentStage]}
            </h2>
          </div>
          <p className="mt-3 text-sm text-muted dark:text-dark-muted max-w-md mx-auto">
            {STAGE_SUBTITLE[currentStage] ?? ""}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest text-muted dark:text-dark-muted">progress</span>
            <span className="text-[11px] font-mono text-muted dark:text-dark-muted tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-line/50 dark:bg-dark-line overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FDD5B0] via-[#FBBF7A] to-[#98D69A] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-white/40 dark:bg-white/10 slide-bar rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Pipeline timeline ──────────────────────────────────── */}
      <div className="glass-card rounded-card p-5 mb-4">
        <p className="text-[11px] uppercase tracking-widest text-muted dark:text-dark-muted mb-4">Pipeline</p>
        <ol className="space-y-2">
          {STAGE_ORDER.map((stage, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex && run.status !== "queued";
            const isNext = i === currentIndex + 1;
            return (
              <li
                key={stage}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${
                  isCurrent
                    ? "bg-[#FFF7DB] dark:bg-[#2A1F00] ring-1 ring-[#F5C542]/50 scale-[1.01]"
                    : isNext
                      ? "bg-[#EAF2FF] dark:bg-[#0D1A35]"
                      : isDone
                        ? "opacity-70"
                        : "opacity-40 blur-[1px]"
                }`}
              >
                <StageChip index={i + 1} state={isDone ? "done" : isCurrent ? "current" : isNext ? "next" : "idle"} />
                <span className={`text-sm flex-1 ${
                  isDone
                    ? "text-muted dark:text-dark-muted line-through decoration-muted/60"
                    : isCurrent
                      ? "text-[#7A5B00] dark:text-[#FBB740] font-semibold"
                      : isNext
                        ? "text-[#1D4ED8] dark:text-[#60A5FA] font-medium"
                        : "text-muted dark:text-dark-muted"
                }`}>
                  {STAGE_LABELS[stage]}
                </span>
                {isDone && <span className="text-[10px] font-mono uppercase text-strong dark:text-dark-strong-text">done</span>}
                {isCurrent && (
                  <span className="text-[10px] font-mono uppercase text-[#8A6B00] dark:text-[#FBB740] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F5C542] animate-pulse" />
                    working
                  </span>
                )}
                {isNext && <span className="text-[10px] font-mono uppercase text-[#1D4ED8] dark:text-[#60A5FA]">next</span>}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Rotating tip card ─────────────────────────────────── */}
      <div
        key={tipIdx}
        className="glass-card bg-gradient-to-br from-coral-bg/50 dark:from-dark-coral-bg/30 via-transparent to-[#EAF3DE]/30 dark:to-[#0E2417]/30 rounded-card p-5 rise"
      >
        <p className="text-[11px] uppercase tracking-widest text-muted dark:text-dark-muted mb-2">
          💡 Coaching tip · while you wait
        </p>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{tip.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-ink dark:text-dark-ink">{tip.title}</h3>
            <p className="mt-1 text-sm text-ink/80 dark:text-dark-ink/80 leading-relaxed">{tip.body}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {TIPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === tipIdx ? "w-6 bg-coral" : "w-1.5 bg-line dark:bg-dark-line"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SpinnerDot() {
  return (
    <span className="relative flex h-4 w-4">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C542] opacity-60" />
      <span className="relative inline-flex rounded-full h-4 w-4 bg-[#F5C542]" />
    </span>
  );
}

function StageChip({ index, state }: { index: number; state: "done" | "current" | "next" | "idle" }) {
  const cls =
    state === "done"    ? "bg-strong text-white" :
    state === "current" ? "bg-[#F5C542] text-white ring-pulse" :
    state === "next"    ? "bg-[#1D4ED8] dark:bg-[#3B82F6] text-white" :
                          "bg-line dark:bg-dark-line text-muted dark:text-dark-muted";
  return (
    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold shrink-0 ${cls}`}>
      {state === "done" ? "✓" : index}
    </span>
  );
}
