// Client-side PDF generation from the SAME `report` + `evaluation_dimensions`
// data the web page renders (PRD §18: "generated from the stored report
// data ... ensures the web version and PDF always match"). No separate
// server round-trip or second LLM call involved.
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { DimensionRow, RunRow } from "../types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 20, marginBottom: 4 },
  grade: { fontSize: 12, marginBottom: 16, color: "#639922" },
  sectionTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6B7280",
    marginBottom: 4,
    marginTop: 14,
  },
  body: { fontSize: 10, lineHeight: 1.4 },
  dimHeader: { fontSize: 11, fontWeight: 700, marginTop: 10 },
  quote: { fontSize: 9, color: "#1C2331", marginBottom: 2 },
});

function ReportDoc({ run, dimensions }: { run: RunRow; dimensions: DimensionRow[] }) {
  const report = run.report;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>
          {run.total_score} / {run.max_score}
        </Text>
        <Text style={styles.grade}>{run.grade}</Text>

        {report && (
          <>
            <Text style={styles.sectionTitle}>The One Thing</Text>
            <Text style={styles.body}>{report.one_thing.text}</Text>

            <Text style={styles.sectionTitle}>Brief</Text>
            <Text style={styles.body}>{report.brief}</Text>

            <Text style={styles.sectionTitle}>Red Flags</Text>
            {report.red_flags.length === 0 ? (
              <Text style={styles.body}>None identified.</Text>
            ) : (
              report.red_flags.map((f, i) => (
                <Text key={i} style={styles.body}>
                  • {f}
                </Text>
              ))
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Dimensions</Text>
        {dimensions.map((d) => (
          <View key={d.id} wrap={false}>
            <Text style={styles.dimHeader}>
              {d.dimension_name} — {d.score ?? 0}/{d.max_score}
            </Text>
            <Text style={styles.body}>{d.reasoning}</Text>
            {d.evidence.map((e, i) => (
              <Text key={i} style={styles.quote}>
                [{e.speaker}] "{e.quote}"
              </Text>
            ))}
            {d.quick_fix && (
              <Text style={styles.body}>Quick fix: {d.quick_fix}</Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function downloadReportPdf(run: RunRow, dimensions: DimensionRow[]) {
  const blob = await pdf(<ReportDoc run={run} dimensions={dimensions} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `call-evaluation-${run.id.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
