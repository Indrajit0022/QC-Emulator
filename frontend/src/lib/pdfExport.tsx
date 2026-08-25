import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { DimensionRow, RunRow } from "../types";
import { clientNameForFilename } from "./clientName";

const CORAL = "#E24B4A";
const INK = "#1C2331";
const MUTED = "#6B7280";
const LINE = "#E5E7EB";
const STRONG = "#639922";
const AMBER = "#D97706";
const BG_LIGHT = "#F8F9FA";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: INK },

  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `1.5pt solid ${INK}`,
  },
  brandMark: { fontSize: 8, fontFamily: "Helvetica-Bold", color: CORAL, letterSpacing: 2, textTransform: "uppercase" },
  clientName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: INK, marginTop: 2 },
  metaLine: { fontSize: 8, color: MUTED, marginTop: 3 },
  scoreBlock: { alignItems: "flex-end" },
  scoreBig: { fontSize: 28, fontFamily: "Helvetica-Bold", color: INK },
  scoreMax: { fontSize: 10, color: MUTED, marginTop: 1 },
  gradeBadge: { fontSize: 8, fontFamily: "Helvetica-Bold", color: STRONG, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },

  scoreBarTrack: { height: 4, backgroundColor: LINE, borderRadius: 2, marginTop: 4, marginBottom: 20 },
  scoreBarFill: { height: 4, borderRadius: 2 },

  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: MUTED,
    marginBottom: 6,
    marginTop: 20,
  },
  sectionLabelFirst: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: MUTED,
    marginBottom: 6,
    marginTop: 0,
  },

  oneThingBox: {
    backgroundColor: BG_LIGHT,
    borderLeft: `3pt solid ${CORAL}`,
    padding: 12,
    marginBottom: 4,
  },
  oneThingText: { fontSize: 11, lineHeight: 1.5, color: INK },

  bodyText: { fontSize: 10, lineHeight: 1.5, color: INK },

  flagItem: { flexDirection: "row", marginBottom: 3 },
  flagBullet: { fontSize: 10, color: CORAL, marginRight: 6, width: 8 },
  capItem: { backgroundColor: BG_LIGHT, borderRadius: 4, padding: 8, marginBottom: 4 },

  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottom: `0.5pt solid ${LINE}`,
    paddingVertical: 8,
  },
  dimIndex: { width: 20, fontSize: 9, color: MUTED, textAlign: "center" },
  dimName: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: INK },
  dimScore: { fontSize: 10, fontFamily: "Helvetica-Bold", width: 40, textAlign: "right" },

  dimDetail: { paddingLeft: 20, paddingTop: 6, paddingBottom: 8 },
  dimReasoning: { fontSize: 9, lineHeight: 1.5, color: INK, marginBottom: 6 },
  evidenceBlock: { backgroundColor: BG_LIGHT, borderRadius: 4, padding: 8, marginBottom: 6 },
  quoteRow: { flexDirection: "row", marginBottom: 4 },
  quoteMark: { fontSize: 9, color: CORAL, marginRight: 4, width: 10 },
  quoteSpeaker: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK },
  quoteText: { fontSize: 9, color: INK, fontStyle: "italic", flex: 1, lineHeight: 1.4 },
  quickFix: { flexDirection: "row" },
  quickFixArrow: { fontSize: 9, color: CORAL, marginRight: 4, width: 10 },
  quickFixText: { fontSize: 9, color: INK, lineHeight: 1.4, flex: 1 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5pt solid ${LINE}`,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: MUTED },
});

function scoreColor(pct: number): string {
  if (pct >= 0.75) return STRONG;
  if (pct >= 0.5) return AMBER;
  return CORAL;
}

function ReportDoc({
  run,
  dimensions,
  client,
}: {
  run: RunRow;
  dimensions: DimensionRow[];
  client: string;
}) {
  const report = run.report;
  const date = new Date(run.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const callLabel = run.call_type === "kickoff" ? "Kick-off Call" : "Coaching Call";
  const coach = run.coach_name;
  const pct = run.total_score && run.max_score ? run.total_score / run.max_score : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.brandMark}>QC Evaluator</Text>
            <Text style={s.clientName}>{client}</Text>
            <Text style={s.metaLine}>
              {callLabel}  {"·"}  {date}
              {coach ? `  ·  Coached by ${coach}` : ""}
            </Text>
          </View>
          <View style={s.scoreBlock}>
            <Text style={s.scoreBig}>{run.total_score ?? 0}</Text>
            <Text style={s.scoreMax}>of {run.max_score ?? 100} points</Text>
            {run.grade && <Text style={[s.gradeBadge, { color: scoreColor(pct) }]}>{run.grade}</Text>}
          </View>
        </View>

        {/* Score bar */}
        {run.total_score !== null && run.max_score !== null && run.max_score > 0 && (
          <View style={s.scoreBarTrack}>
            <View style={[s.scoreBarFill, {
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: scoreColor(pct),
            }]} />
          </View>
        )}

        {report && (
          <>
            {/* The One Thing */}
            <Text style={s.sectionLabelFirst}>The One Thing</Text>
            <View style={s.oneThingBox}>
              <Text style={s.oneThingText}>{report.one_thing.text}</Text>
            </View>

            {/* Brief */}
            <Text style={s.sectionLabel}>Summary</Text>
            <Text style={s.bodyText}>{report.brief}</Text>

            {/* Red Flags */}
            <Text style={s.sectionLabel}>Red Flags</Text>
            {report.red_flags.length === 0 ? (
              <Text style={[s.bodyText, { color: MUTED }]}>None identified.</Text>
            ) : (
              report.red_flags.map((f, i) => (
                <View key={i} style={s.flagItem}>
                  <Text style={s.flagBullet}>{"•"}</Text>
                  <Text style={[s.bodyText, { flex: 1 }]}>{f}</Text>
                </View>
              ))
            )}

            {/* Caps */}
            {report.caps_applied.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Rubric Caps Applied</Text>
                {report.caps_applied.map((c, i) => (
                  <View key={i} style={s.capItem}>
                    <Text style={s.bodyText}>{c}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* Dimensions */}
        <Text style={s.sectionLabel}>Dimensions ({dimensions.length})</Text>
        {dimensions.map((d, idx) => {
          const dp = d.max_score > 0 ? (d.score ?? 0) / d.max_score : 0;
          return (
            <View key={d.id} wrap={false}>
              <View style={s.dimRow}>
                <Text style={s.dimIndex}>{idx + 1}</Text>
                <Text style={s.dimName}>{d.dimension_name}</Text>
                <Text style={[s.dimScore, { color: scoreColor(dp) }]}>
                  {d.score ?? 0}/{d.max_score}
                </Text>
              </View>
              <View style={s.dimDetail}>
                {d.reasoning && <Text style={s.dimReasoning}>{d.reasoning}</Text>}
                {d.evidence.length > 0 && (
                  <View style={s.evidenceBlock}>
                    {d.evidence.map((e, i) => (
                      <View key={i} style={s.quoteRow}>
                        <Text style={s.quoteMark}>{"❝"}</Text>
                        <View style={{ flex: 1 }}>
                          <Text>
                            <Text style={s.quoteSpeaker}>{e.speaker}: </Text>
                            <Text style={s.quoteText}>"{e.quote}"</Text>
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {d.quick_fix && (
                  <View style={s.quickFix}>
                    <Text style={s.quickFixArrow}>{"→"}</Text>
                    <Text style={s.quickFixText}>{d.quick_fix}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>QC Evaluator  {"·"}  {client}  {"·"}  {date}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function downloadReportPdf(
  run: RunRow,
  dimensions: DimensionRow[],
  client: string,
) {
  const blob = await pdf(
    <ReportDoc run={run} dimensions={dimensions} client={client} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clientNameForFilename(client)}-evaluation.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
