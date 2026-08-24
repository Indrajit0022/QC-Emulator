import { useState } from "react";
import type { DimensionRow, RunRow } from "../types";
import DimensionCard from "./DimensionCard";
import ScoreGauge from "./ScoreGauge";
import { gradeTokens } from "../lib/grade";
import { downloadReportPdf } from "../lib/pdfExport";

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

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReportPdf(run, dimensions);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Score + stat row — mirrors the dial + metric-card layout */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-paper border border-line rounded-card p-5 flex flex-col items-center justify-center">
          <p className="text-xs uppercase tracking-widest text-muted mb-2 self-start">Score</p>
          <ScoreGauge score={run.total_score ?? 0} max={run.max_score ?? 100} />
          <span className={`mt-1 text-xs font-medium px-3 py-1 rounded-full ${grade.bg} ${grade.text}`}>
            {run.grade}
          </span>
        </div>

        <div className="bg-line/30 rounded-card p-4 flex flex-col justify-center">
          <p className="text-xs text-muted mb-1">evidence coverage</p>
          <p className="text-2xl font-semibold text-ink">{report?.evidence_coverage ?? "—"}</p>
        </div>

        <div className="bg-line/30 rounded-card p-4 flex flex-col justify-center">
          <p className="text-xs text-muted mb-1">rubric caps applied</p>
          <p className="text-2xl font-semibold text-ink">{report?.caps_applied.length ?? 0}</p>
        </div>
      </div>

      {report && (
        <div className="space-y-6 mb-10">
          <Section title="The one thing">
            <p className="text-ink">{report.one_thing.text}</p>
          </Section>

          <Section title="Brief">
            <p className="text-ink">{report.brief}</p>
          </Section>

          <Section title="Red flags">
            {report.red_flags.length === 0 ? (
              <p className="text-muted italic">None identified.</p>
            ) : (
              <ul className="space-y-1.5">
                {report.red_flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-weak-text">
                    <span className="text-coral">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {report.caps_applied.length > 0 && (
            <Section title="Rubric caps applied">
              <ul className="space-y-1.5">
                {report.caps_applied.map((c, i) => (
                  <li key={i} className="text-sm text-ink bg-coral-bg/60 rounded-lg px-3 py-2">
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted">
          {dimensions.length} dimensions
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="text-sm font-medium text-ink border border-line rounded-full px-4 py-1.5 hover:bg-line/30 disabled:opacity-50"
        >
          {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>

      <div className="space-y-2">
        {dimensions.map((d) => (
          <DimensionCard key={d.id} dim={d} />
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted mb-2">{title}</p>
      {children}
    </div>
  );
}
