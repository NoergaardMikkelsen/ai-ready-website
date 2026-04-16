"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Colour tokens (matching brand)
const HEAT = "#df475b";
const BLACK = "#1a1a1a";
const GREY = "#6b6b6b";
const LIGHT = "#f5f5f5";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  headerLeft: { flex: 1 },
  brandName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  brandSub: { fontSize: 9, color: GREY },
  headerRight: { alignItems: "flex-end" },
  dateText: { fontSize: 9, color: GREY },
  // Title block
  titleBlock: { marginBottom: 28 },
  reportTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 6 },
  urlText: { fontSize: 10, color: GREY },
  // Score
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT,
    borderRadius: 10,
    padding: 20,
    marginBottom: 32,
  },
  scoreBig: { fontSize: 42, fontFamily: "Helvetica-Bold", color: HEAT, marginRight: 16 },
  scoreLabel: { fontSize: 11, color: GREY, marginTop: 4 },
  scoreNote: { fontSize: 10, color: GREY, flex: 1, textAlign: "right" },
  // Section heading
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: GREY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  // Check item
  checkItem: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  checkHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  checkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: HEAT, marginRight: 8 },
  checkLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK, flex: 1 },
  checkScore: { fontSize: 11, fontFamily: "Helvetica-Bold", color: HEAT },
  // Bar
  barBg: { height: 4, backgroundColor: "#e8e8e8", borderRadius: 2, marginBottom: 8 },
  barFill: { height: 4, borderRadius: 2, backgroundColor: HEAT },
  // Details
  detailLabel: { fontSize: 8, color: GREY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3, marginTop: 6 },
  detailText: { fontSize: 10, color: BLACK, lineHeight: 1.5 },
  detailTextMuted: { fontSize: 10, color: GREY, lineHeight: 1.5 },
  // Action items
  actionItem: { flexDirection: "row", marginBottom: 3 },
  actionDot: { fontSize: 10, color: HEAT, marginRight: 6, marginTop: 1 },
  actionText: { fontSize: 10, color: GREY, flex: 1, lineHeight: 1.5 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    paddingTop: 10,
  },
  footerText: { fontSize: 8, color: "#bbbbbb" },
});

type CheckItem = {
  id: string;
  label: string;
  score?: number;
  status: string;
  details?: string;
  recommendation?: string;
  actionItems?: string[];
};

type Props = {
  url: string;
  overallScore: number;
  checks: CheckItem[];
  aiChecks?: CheckItem[];
  date?: string;
};

export default function PDFReport({ url, overallScore, checks, aiChecks = [], date }: Props) {
  const formattedDate = date ?? new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  const allChecks = [...checks, ...aiChecks];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>Nørgård Mikkelsen</Text>
            <Text style={styles.brandSub}>AI-parathedsanalyse</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.reportTitle}>AI-parathedsanalyse</Text>
          <Text style={styles.urlText}>{url}</Text>
        </View>

        {/* Overall score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreBig}>{overallScore}%</Text>
          <View>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK }}>Samlet AI-score</Text>
            <Text style={styles.scoreLabel}>Baseret på {allChecks.length} målinger</Text>
          </View>
          <Text style={styles.scoreNote}>
            {overallScore >= 80 ? "God AI-parathed" : overallScore >= 60 ? "Middel AI-parathed" : "Lav AI-parathed"}
          </Text>
        </View>

        {/* Checks */}
        <Text style={styles.sectionHeading}>Analyseresultater</Text>
        {allChecks.map((check) => (
          <View key={check.id} style={styles.checkItem} wrap={false}>
            <View style={styles.checkHeader}>
              <View style={styles.checkDot} />
              <Text style={styles.checkLabel}>{check.label}</Text>
              <Text style={styles.checkScore}>{check.score ?? 0}%</Text>
            </View>
            {/* Bar */}
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${check.score ?? 0}%` }]} />
            </View>
            {check.details && (
              <>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailText}>{check.details}</Text>
              </>
            )}
            {check.recommendation && (
              <>
                <Text style={styles.detailLabel}>Anbefaling</Text>
                <Text style={styles.detailTextMuted}>{check.recommendation}</Text>
              </>
            )}
            {check.actionItems && check.actionItems.length > 0 && (
              <>
                <Text style={styles.detailLabel}>Handlingspunkter</Text>
                {check.actionItems.map((item, i) => (
                  <View key={i} style={styles.actionItem}>
                    <Text style={styles.actionDot}>•</Text>
                    <Text style={styles.actionText}>{item}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>nmic.dk — AI-parathedsanalyse</Text>
          <Text style={styles.footerText}>{url}</Text>
        </View>
      </Page>
    </Document>
  );
}
