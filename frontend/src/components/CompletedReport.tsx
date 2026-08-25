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

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReportPdf(run, dimensions, client);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10 py-10">
      {/* Top-of-page nav — Home + PDF */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M3 12l9-9 9 9M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="text-sm font-medium text-ink border border-line rounded-full px-4 py-1.5 hover:bg-line/30 disabled:opacity-50 flex items-center gap-2"
        >
          {downloading && (
            <span className="h-3 w-3 rounded-full border-2 border-ink border-t-transparent animate-spin" />
          )}
          {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>

      {/* Hero header: client + call type + gauge */}
      <div className="bg-card border border-line rounded-card p-6 md:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          <div className="md:col-span-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              {run.call_type} call
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">{client}</h1>
            <div className="mt-3 flex items-center gap-3">
              {run.grade && (
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${grade.bg} ${grade.text}`}>
                  {run.grade}
                </span>
              )}
              <span className="text-xs text-muted">
                Evidence {report?.evidence_coverage ?? "—"} · {report?.caps_applied.length ?? 0} caps
              </span>
            </div>
          </div>
          <div className="md:col-span-2 flex justify-center">
            <GradientGauge score={run.total_score ?? 0} max={run.max_score ?? 100} />
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Summary card — The One Thing + Brief side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SummaryCard
              accent
              title="The one thing"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M12 2l2.4 6.4L21 9l-5 4.6L17.5 21 12 17.3 6.5 21 8 13.6 3 9l6.6-.6L12 2z" strokeLinejoin="round" />
                </svg>
              }
            >
              <p className="text-ink leading-relaxed">{report.one_thing.text}</p>
            </SummaryCard>

            <SummaryCard
              title="Brief"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M4 4h16v16H4z" />
                  <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
                </svg>
              }
            >
              <p className="text-ink leading-relaxed">{report.brief}</p>
            </SummaryCard>
          </div>

          {/* Red flags + caps */}
          {(report.red_flags.length > 0 || report.caps_applied.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {report.red_flags.length > 0 && (
                <SummaryCard
                  title="Red flags"
                  tone="weak"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M4 21V4m0 0h13l-2 5 2 5H4" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  <ul className="space-y-1.5">
                    {report.red_flags.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-weak-text">
                        <span className="text-coral">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </SummaryCard>
              )}
              {report.caps_applied.length > 0 && (
                <SummaryCard
                  title="Rubric caps applied"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M4 12h16M6 8h12M8 16h8" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <ul className="space-y-1.5">
                    {report.caps_applied.map((c, i) => (
                      <li key={i} className="text-sm text-ink bg-coral-bg/60 rounded-lg px-3 py-2">
                        {c}
                      </li>
                    ))}
                  </ul>
                </SummaryCard>
              )}
            </div>
          )}
        </>
      )}

      {/* Dimensions */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted">
          {dimensions.length} dimensions
        </p>
        <p className="text-[11px] text-muted">Click a row to see reasoning and evidence.</p>
      </div>
      <div className="space-y-2">
        {dimensions.map((d) => (
          <DimensionCard key={d.id} dim={d} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  children,
  icon,
  accent,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  tone?: "weak";
}) {
  const border = accent ? "border-coral/40" : tone === "weak" ? "border-weak/30" : "border-line";
  const iconBg = accent
    ? "bg-coral text-white"
    : tone === "weak"
      ? "bg-weak-bg text-weak-text"
      : "bg-paper text-muted";
  return (
    <div className={`bg-card border ${border} rounded-card p-5`}>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</span>}
        <p className="text-xs uppercase tracking-widest text-muted">{title}</p>
      </div>
      {children}
    </div>
  );
}
