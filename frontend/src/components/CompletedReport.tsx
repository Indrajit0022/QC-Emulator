import { useState } from "react";
import { Link } from "react-router-dom";
import type { DimensionRow, RunRow } from "../types";
import DimensionCard from "./DimensionCard";
import GradientGauge from "./GradientGauge";
import { gradeTokens } from "../lib/grade";
import { downloadReportPdf } from "../lib/pdfExport";
import { extractClientName } from "../lib/clientName";

export default function CompletedReport({
  run,
  dimensions,
}: {
  run: RunRow;
  dimensions: DimensionRow[];
}) {
  const [downloading, setDownloading] = useState(false);
  const report = run.report;
  const grade = gradeTokens(run.grade);
  const client = extractClientName(run.transcript);
  const dateStr = new Date(run.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const callTypeLabel = run.call_type === "kickoff" ? "Kick-off call" : "Coaching call";

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReportPdf(run, dimensions, client);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-8">
      {/* Top nav bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/evaluations"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to evaluations
        </Link>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg bg-ink text-white px-4 py-2 text-sm font-medium hover:bg-ink/90 disabled:opacity-50"
        >
          {downloading ? (
            <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>

      {/* Headline */}
      <div className="mb-4">
        <h1 className="text-3xl font-semibold text-ink">{client}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
            </svg>
            {dateStr}
          </span>
          <span className="text-line">•</span>
          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
            {callTypeLabel}
          </span>
        </div>
      </div>

      {/* Summary card — brief + gauge */}
      {report && (
        <div className="bg-card border border-line rounded-card p-6 md:p-7 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            <div className="md:col-span-3">
              <h2 className="text-xl font-semibold text-ink leading-snug">
                {reportHeadline(run.grade)}
              </h2>
              <p className="mt-3 text-sm text-ink/80 leading-relaxed">{report.brief}</p>
            </div>
            <div className="md:col-span-2 flex flex-col items-center">
              <GradientGauge score={run.total_score ?? 0} max={run.max_score ?? 100} />
              {run.grade && (
                <span className={`-mt-1 text-[11px] font-medium px-3 py-1 rounded-full ${grade.bg} ${grade.text}`}>
                  {run.grade}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* The one thing */}
      {report && (
        <div className="bg-card border border-line rounded-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-6 w-6 rounded-lg bg-coral text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path d="M12 2l2.4 6.4L21 9l-5 4.6L17.5 21 12 17.3 6.5 21 8 13.6 3 9l6.6-.6L12 2z" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="text-xs uppercase tracking-widest text-muted">The one thing</p>
          </div>
          <p className="text-sm text-ink leading-relaxed">{report.one_thing.text}</p>
        </div>
      )}

      {/* Red flags + caps side-by-side */}
      {report && (report.red_flags.length > 0 || report.caps_applied.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {report.red_flags.length > 0 && (
            <div className="bg-card border border-weak/30 rounded-card p-5">
              <p className="text-xs uppercase tracking-widest text-weak-text mb-2">Red flags</p>
              <ul className="space-y-1.5">
                {report.red_flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink">
                    <span className="text-coral shrink-0">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.caps_applied.length > 0 && (
            <div className="bg-card border border-line rounded-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Rubric caps applied</p>
              <ul className="space-y-1.5">
                {report.caps_applied.map((c, i) => (
                  <li key={i} className="text-sm text-ink bg-coral-bg/60 rounded-lg px-3 py-2">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Numbered dimension list */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Dimensions</h2>
        <p className="text-[11px] text-muted">Click a row for reasoning and evidence.</p>
      </div>
      <div className="bg-card border border-line rounded-card overflow-hidden">
        {dimensions.map((d, i) => (
          <DimensionCard key={d.id} dim={d} index={i + 1} last={i === dimensions.length - 1} />
        ))}
      </div>
    </div>
  );
}

// A one-line, plain-English headline for the summary card, based on grade.
function reportHeadline(grade: string | null): string {
  switch (grade) {
    case "Elite":
      return "Elite call — clear structure, evidence-rich delivery.";
    case "Strong":
      return "Strong call with solid rapport and clear guidance.";
    case "Inconsistent":
      return "Inconsistent call — good moments alongside missed openings.";
    case "At Risk":
      return "At-risk call — key coaching behaviours were missing.";
    case "Fail":
      return "Failing call — core rubric expectations were not met.";
    default:
      return "Call evaluation summary";
  }
}
