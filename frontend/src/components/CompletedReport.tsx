import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { DimensionRow, RunRow } from "../types";
import DimensionCard from "./DimensionCard";
import GradientGauge from "./GradientGauge";
import { gradeTokens } from "../lib/grade";
import { downloadReportPdf } from "../lib/pdfExport";
import { extractClientName } from "../lib/clientName";

// ── Section registry for dotted progress bar ──────────────────────────
type SectionKey = "overview" | "one_thing" | "flags" | "dimensions";
const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "overview",   label: "Overview",   icon: "◉" },
  { key: "one_thing",  label: "One Thing",  icon: "★" },
  { key: "flags",      label: "Flags",      icon: "⚑" },
  { key: "dimensions", label: "Dimensions", icon: "≡" },
];

export default function CompletedReport({
  run,
  dimensions,
}: {
  run: RunRow;
  dimensions: DimensionRow[];
}) {
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const report = run.report;
  const grade = gradeTokens(run.grade);
  const client = extractClientName(run.transcript);
  const dateStr = new Date(run.created_at).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  const callTypeLabel = run.call_type === "kickoff" ? "Kick-off call" : "Coaching call";

  // Refs for each section (hooks must be at top level, not inside objects)
  const refOverview   = useRef<HTMLDivElement>(null);
  const refOneThing   = useRef<HTMLDivElement>(null);
  const refFlags      = useRef<HTMLDivElement>(null);
  const refDimensions = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement>> = {
    overview:   refOverview,
    one_thing:  refOneThing,
    flags:      refFlags,
    dimensions: refDimensions,
  };

  // Intersection observer to update active dot
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.keys(sectionRefs) as SectionKey[]).forEach((key) => {
      const el = sectionRefs[key].current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(key); },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function scrollTo(key: SectionKey) {
    sectionRefs[key].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(key);
  }

  async function handleDownload() {
    setDownloading(true);
    try { await downloadReportPdf(run, dimensions, client); }
    finally { setDownloading(false); }
  }

  // Which sections actually have content?
  const hasFlags = report && (report.red_flags.length > 0 || report.caps_applied.length > 0);
  const visibleSections = SECTIONS.filter((s) => {
    if (s.key === "flags") return !!hasFlags;
    if (s.key === "one_thing") return !!report;
    if (s.key === "overview") return !!report;
    return true;
  });

  return (
    <div className="relative">
      {/* ── Sticky dotted progress rail (right side) ─────────────── */}
      <div className="hidden xl:flex flex-col items-center gap-2 fixed right-6 top-1/2 -translate-y-1/2 z-30">
        {visibleSections.map((s, i) => {
          const isActive = activeSection === s.key;
          return (
            <div key={s.key} className="flex flex-col items-center">
              {/* Connector line above (except first) */}
              {i > 0 && (
                <div className={`w-px mb-1 rounded-full transition-all duration-300 ${
                  visibleSections.findIndex(x => x.key === activeSection) >= i
                    ? "h-6 bg-coral/60"
                    : "h-6 bg-line dark:bg-dark-line"
                }`} />
              )}
              <button
                onClick={() => scrollTo(s.key)}
                title={s.label}
                className={`
                  rounded-full transition-all duration-300 dot-pop flex items-center justify-center
                  ${isActive
                    ? "h-3 w-3 bg-coral shadow-[0_0_0_3px_rgba(226,75,74,0.2)]"
                    : "h-2 w-2 bg-line dark:bg-dark-line hover:bg-muted dark:hover:bg-dark-muted"
                  }
                `}
              />
              {/* Label tooltip on hover */}
              <div className={`
                absolute right-6 text-[10px] font-medium px-2 py-0.5 rounded-lg whitespace-nowrap
                bg-ink dark:bg-dark-surface text-white dark:text-dark-ink
                opacity-0 hover:opacity-100 pointer-events-none transition-opacity
                ${isActive ? "opacity-100" : ""}
              `} style={{ right: "1.75rem" }}>
                {isActive ? s.label : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto max-w-5xl px-6 md:px-12 py-8">
        {/* ── Top nav ──────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/evaluations"
            className="inline-flex items-center gap-2 text-sm text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to evaluations
          </Link>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-ink dark:bg-dark-surface text-white dark:text-dark-ink px-4 py-2 text-sm font-medium hover:bg-ink/90 dark:hover:bg-dark-line disabled:opacity-50 transition-colors border border-transparent dark:border-dark-line"
          >
            {downloading ? (
              <span className="h-3 w-3 rounded-full border-2 border-white dark:border-dark-muted border-t-transparent animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {downloading ? "Generating…" : "Download PDF"}
          </button>
        </div>

        {/* ── Hero summary card ─────────────────────────────────────── */}
        <div ref={sectionRefs.overview}>
          <div className="mb-6 rounded-card overflow-hidden border border-line dark:border-dark-line">
            {/* Gradient banner */}
            <div className="bg-gradient-to-br from-[#1C2331] via-[#2D3460] to-[#1C2331] dark:from-[#0F1117] dark:via-[#1A2040] dark:to-[#0F1117] px-8 py-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Left: client info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${grade.bg} ${grade.text}`}>
                      {callTypeLabel}
                    </span>
                    {run.grade && (
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 text-white`}>
                        {run.grade}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-white leading-tight">{client}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/60">
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                      </svg>
                      {dateStr}
                    </span>
                    <span>•</span>
                    <span>{dimensions.length} dimensions scored</span>
                  </div>
                </div>

                {/* Right: score + gauge */}
                <div className="flex flex-col items-center shrink-0">
                  <GradientGauge score={run.total_score ?? 0} max={run.max_score ?? 100} dark={true} />
                  <div className="mt-1 text-center">
                    <div className="text-white/60 text-xs">
                      {run.total_score} / {run.max_score} points
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score bar strip */}
            {run.total_score !== null && run.max_score !== null && run.max_score > 0 && (
              <div className="bg-card dark:bg-dark-card px-8 py-4 border-t border-line dark:border-dark-line">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted shrink-0">Score</span>
                  <div className="flex-1 h-2 rounded-full bg-line dark:bg-dark-line overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-coral via-[#F59E0B] to-strong transition-all duration-700"
                      style={{ width: `${Math.round((run.total_score / run.max_score) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-ink dark:text-dark-ink tabular-nums shrink-0">
                    {Math.round((run.total_score / run.max_score) * 100)}%
                  </span>
                </div>
                {/* Dimension scores mini-row */}
                {dimensions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {dimensions.map((d) => {
                      const pct = d.max_score > 0 ? (d.score ?? 0) / d.max_score : 0;
                      const color = pct >= 0.75 ? "bg-strong" : pct >= 0.5 ? "bg-[#F59E0B]" : "bg-coral";
                      return (
                        <div key={d.id} title={`${d.dimension_name}: ${d.score}/${d.max_score}`}
                          className={`h-1.5 rounded-full ${color} opacity-70`}
                          style={{ width: `${Math.max(8, Math.round(pct * 48))}px` }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Brief ────────────────────────────────────────────────── */}
          {report && (
            <div className="bg-card dark:bg-dark-card border border-line dark:border-dark-line rounded-card p-6 mb-4">
              <h2 className="text-lg font-semibold text-ink dark:text-dark-ink leading-snug mb-3">
                {reportHeadline(run.grade)}
              </h2>
              <p className="text-sm text-ink/80 dark:text-dark-ink/80 leading-relaxed">{report.brief}</p>
            </div>
          )}
        </div>

        {/* ── The one thing ─────────────────────────────────────────── */}
        {report && (
          <div ref={sectionRefs.one_thing} className="bg-card dark:bg-dark-card border border-line dark:border-dark-line rounded-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-lg bg-coral text-white flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path d="M12 2l2.4 6.4L21 9l-5 4.6L17.5 21 12 17.3 6.5 21 8 13.6 3 9l6.6-.6L12 2z" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted">The one thing</p>
            </div>
            <p className="text-sm text-ink dark:text-dark-ink leading-relaxed">{report.one_thing.text}</p>
          </div>
        )}

        {/* ── Red flags + caps ──────────────────────────────────────── */}
        {hasFlags && (
          <div ref={sectionRefs.flags} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {report!.red_flags.length > 0 && (
              <div className="bg-card dark:bg-dark-card border border-coral/20 dark:border-coral/15 rounded-card p-5">
                <p className="text-xs uppercase tracking-widest text-coral mb-3">Red flags</p>
                <ul className="space-y-1.5">
                  {report!.red_flags.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink dark:text-dark-ink">
                      <span className="text-coral shrink-0 mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report!.caps_applied.length > 0 && (
              <div className="bg-card dark:bg-dark-card border border-line dark:border-dark-line rounded-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted dark:text-dark-muted mb-3">Rubric caps applied</p>
                <ul className="space-y-1.5">
                  {report!.caps_applied.map((c, i) => (
                    <li key={i} className="text-sm text-ink dark:text-dark-ink bg-coral-bg dark:bg-dark-coral-bg rounded-lg px-3 py-2">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Dimensions ───────────────────────────────────────────── */}
        <div ref={sectionRefs.dimensions}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink dark:text-dark-ink">Dimensions</h2>
            <p className="text-[11px] text-muted dark:text-dark-muted">Click a row for reasoning and evidence.</p>
          </div>
          <div className="bg-card dark:bg-dark-card border border-line dark:border-dark-line rounded-card overflow-hidden">
            {dimensions.map((d, i) => (
              <DimensionCard key={d.id} dim={d} index={i + 1} last={i === dimensions.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function reportHeadline(grade: string | null): string {
  switch (grade) {
    case "Elite":       return "Elite call — clear structure, evidence-rich delivery.";
    case "Strong":      return "Strong call with solid rapport and clear guidance.";
    case "Inconsistent": return "Inconsistent call — good moments alongside missed openings.";
    case "At Risk":     return "At-risk call — key coaching behaviours were missing.";
    case "Fail":        return "Failing call — core rubric expectations were not met.";
    default:            return "Call evaluation summary";
  }
}
