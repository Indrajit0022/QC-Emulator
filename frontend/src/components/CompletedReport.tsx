import { useState } from "react";
import type { DimensionRow, RunRow } from "../types";
import DimensionCard from "./DimensionCard";
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

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReportPdf(run, dimensions);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-baseline justify-between">
        <h1 className="text-4xl font-semibold text-ink">
          {run.total_score} / {run.max_score}
        </h1>
        <span className="font-mono text-sm uppercase tracking-widest text-strong">
          {run.grade}
        </span>
      </div>

      {report && (
        <div className="mt-8 space-y-8">
          <Section title="The One Thing">
            <p className="text-ink">{report.one_thing.text}</p>
          </Section>

          <Section title="Brief">
            <p className="text-ink">{report.brief}</p>
          </Section>

          <Section title="Red Flags">
            {report.red_flags.length === 0 ? (
              <p className="text-muted italic">None identified.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {report.red_flags.map((f, i) => (
                  <li key={i} className="text-weak">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <p className="text-xs text-muted">
            Evidence coverage: {report.evidence_coverage}
          </p>
        </div>
      )}

      <div className="mt-10">
        <p className="text-xs uppercase tracking-widest text-muted mb-3">
          {dimensions.length} Dimensions
        </p>
        <div className="space-y-2">
          {dimensions.map((d) => (
            <DimensionCard key={d.id} dim={d} />
          ))}
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-10 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
      >
        {downloading ? "Generating…" : "Download PDF"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted mb-1">
        {title}
      </p>
      {children}
    </div>
  );
}
