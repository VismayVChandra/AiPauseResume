import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { TailoredResume } from "@/types/resume";
import { parseInlineMarkdown } from "@/lib/rich-text";

function dateRange(start?: string, end?: string) {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" – ");
}

function eduLine(ed: { degree: string; field?: string; institution: string }) {
  const degreeField = [ed.degree, ed.field].filter(Boolean).join(", ");
  return [degreeField, ed.institution].filter(Boolean).join(" · ");
}

function contactParts(resume: TailoredResume) {
  return [
    resume.contact.location,
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.portfolioLink,
  ].filter(Boolean) as string[];
}

const disclaimer =
  "Generated with AI assistance — review all details for accuracy before submitting.";

// User-controlled layout choices — never set by the AI. Classic
// deliberately never reads accentColor: its whole pitch is "no color,
// maximum ATS compatibility."
function isHidden(resume: TailoredResume, section: "projects" | "certifications" | "extras") {
  return resume.hiddenSections.includes(section);
}

// Renders a bullet's **bold**/_italic_ markers as inline styled runs inside
// one <Text>, instead of literal asterisks/underscores. `prefix` carries
// each template's own bullet glyph (e.g. "• ") so it stays outside the
// parsed/styled content.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RichBullet({ text, style, prefix }: { text: string; style: any; prefix?: string }) {
  const segments = parseInlineMarkdown(text);
  return (
    <Text style={style}>
      {prefix}
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={{
            fontWeight: seg.bold ? 700 : undefined,
            fontStyle: seg.italic ? "italic" : undefined,
          }}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

/* ---------------------------------------------------------------------- */
/* Classic — single column, no color, maximum ATS compatibility           */
/* ---------------------------------------------------------------------- */

const classicStyles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  name: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  headline: { fontSize: 11, color: "#374151", marginBottom: 6 },
  contactRow: { fontSize: 9, color: "#4b5563", marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 4,
    borderBottom: "1 solid #d1d5db",
    paddingBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summary: { fontSize: 10, lineHeight: 1.4 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  entryTitle: { fontSize: 10.5, fontWeight: 700, width: "76%", paddingRight: 8 },
  entrySub: { fontSize: 9.5, color: "#374151" },
  entryDates: { fontSize: 9, color: "#6b7280", width: "24%", textAlign: "right" },
  bullet: { fontSize: 9.5, marginLeft: 10, marginTop: 2, lineHeight: 1.35 },
  skillsRow: { fontSize: 9.5, lineHeight: 1.5 },
  disclaimer: { fontSize: 7, color: "#9ca3af", marginTop: 16, textAlign: "center" },
});

function ClassicResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = classicStyles;
  return (
    <Document title={`${resume.fullName} - Resume`}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{resume.fullName}</Text>
        {resume.headline ? <Text style={s.headline}>{resume.headline}</Text> : null}
        {contactParts(resume).length ? (
          <Text style={s.contactRow}>{contactParts(resume).join("  |  ")}</Text>
        ) : null}

        {resume.summary ? (
          <>
            <Text style={s.sectionTitle}>Summary</Text>
            <Text style={s.summary}>{resume.summary}</Text>
          </>
        ) : null}

        {resume.experience.length ? (
          <>
            <Text style={s.sectionTitle}>Experience</Text>
            {resume.experience.map((exp, i) => (
              <View key={i} wrap={false}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>
                    {exp.title} · {exp.company}
                  </Text>
                  <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                </View>
                {exp.location ? <Text style={s.entrySub}>{exp.location}</Text> : null}
                {exp.bullets.map((b, j) => (
                  <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.projects.length && !isHidden(resume, "projects") ? (
          <>
            <Text style={s.sectionTitle}>Projects</Text>
            {resume.projects.map((p, i) => (
              <View key={i} wrap={false}>
                <Text style={s.entryTitle}>
                  {p.name}
                  {p.link ? `  (${p.link})` : ""}
                </Text>
                {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                {p.bullets.map((b, j) => (
                  <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.education.length ? (
          <>
            <Text style={s.sectionTitle}>Education</Text>
            {resume.education.map((ed, i) => (
              <View key={i} style={s.entryHeader}>
                <Text style={s.entryTitle}>{eduLine(ed)}</Text>
                <Text style={s.entryDates}>{dateRange(ed.startDate, ed.endDate)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {resume.skills.length ? (
          <>
            <Text style={s.sectionTitle}>Skills</Text>
            <Text style={s.skillsRow}>{resume.skills.join("  ·  ")}</Text>
          </>
        ) : null}

        {resume.certifications.length && !isHidden(resume, "certifications") ? (
          <>
            <Text style={s.sectionTitle}>Certifications</Text>
            {resume.certifications.map((c, i) => (
              <Text key={i} style={s.bullet}>
                • {c.name}
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </Text>
            ))}
          </>
        ) : null}

        {resume.interests && !isHidden(resume, "extras") ? (
          <>
            <Text style={s.sectionTitle}>Interests</Text>
            <Text style={s.summary}>{resume.interests}</Text>
          </>
        ) : null}

        <Text style={s.disclaimer}>{disclaimer}</Text>
      </Page>
    </Document>
  );
}

/* ---------------------------------------------------------------------- */
/* Modern — accent color, left sidebar for contact/skills/education       */
/* ---------------------------------------------------------------------- */

const ACCENT = "#2563eb";

const modernStyles = StyleSheet.create({
  page: { flexDirection: "row", fontFamily: "Helvetica", fontSize: 9.5, color: "#111827" },
  sidebar: { width: "36%", backgroundColor: "#0f172a", padding: 30, color: "#e5e7eb" },
  main: { width: "64%", padding: 34 },
  name: { fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 4, lineHeight: 1.2 },
  headline: { fontSize: 10, color: "#93c5fd", marginBottom: 22, lineHeight: 1.4 },
  sideSectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 9,
    borderBottom: "0.5 solid #334155",
    paddingBottom: 5,
  },
  sideLine: { fontSize: 8.5, color: "#d1d5db", marginBottom: 7, lineHeight: 1.5 },
  skillPill: { fontSize: 8.5, color: "#e5e7eb", marginBottom: 6, lineHeight: 1.4 },
  photo: { width: 72, height: 72, borderRadius: 36, marginBottom: 14 },
  mainSectionTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: ACCENT,
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "0.75 solid #dbeafe",
    paddingBottom: 4,
  },
  summary: { fontSize: 9.5, lineHeight: 1.6, color: "#1f2937" },
  entryBlock: { marginBottom: 14 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.35,
    width: "74%",
    paddingRight: 8,
  },
  entrySub: { fontSize: 9, color: "#4b5563", marginTop: 1, marginBottom: 4 },
  entryDates: { fontSize: 8.5, color: "#6b7280", width: "26%", textAlign: "right" },
  bullet: { fontSize: 9.2, marginLeft: 9, marginTop: 4, lineHeight: 1.5, color: "#1f2937" },
  disclaimer: { fontSize: 6.5, color: "#9ca3af", marginTop: 22 },
});

function ModernResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = modernStyles;
  // Only the main content area's section titles pick up a custom accent —
  // the sidebar's light-blue labels stay fixed so they're always readable
  // against its dark navy background regardless of what color is chosen.
  const accentStyle = resume.accentColor ? { color: resume.accentColor } : {};
  return (
    <Document title={`${resume.fullName} - Resume`}>
      <Page size="A4" style={s.page}>
        <View style={s.sidebar}>
          {resume.photoDataUrl ? <Image src={resume.photoDataUrl} style={s.photo} /> : null}
          <Text style={s.name}>{resume.fullName}</Text>
          {resume.headline ? <Text style={s.headline}>{resume.headline}</Text> : null}

          {contactParts(resume).length ? (
            <>
              <Text style={s.sideSectionTitle}>Contact</Text>
              {contactParts(resume).map((c, i) => (
                <Text key={i} style={s.sideLine}>
                  {c}
                </Text>
              ))}
            </>
          ) : null}

          {resume.skills.length ? (
            <>
              <Text style={s.sideSectionTitle}>Skills</Text>
              {resume.skills.map((sk, i) => (
                <Text key={i} style={s.skillPill}>
                  • {sk}
                </Text>
              ))}
            </>
          ) : null}

          {resume.education.length ? (
            <>
              <Text style={s.sideSectionTitle}>Education</Text>
              {resume.education.map((ed, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={s.sideLine}>{eduLine(ed)}</Text>
                  <Text style={[s.sideLine, { marginTop: -4, color: "#94a3b8", fontSize: 8 }]}>
                    {dateRange(ed.startDate, ed.endDate)}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {resume.certifications.length && !isHidden(resume, "certifications") ? (
            <>
              <Text style={s.sideSectionTitle}>Certifications</Text>
              {resume.certifications.map((c, i) => (
                <Text key={i} style={s.sideLine}>
                  {c.name}
                  {c.issuer ? ` — ${c.issuer}` : ""}
                </Text>
              ))}
            </>
          ) : null}

          {resume.interests && !isHidden(resume, "extras") ? (
            <>
              <Text style={s.sideSectionTitle}>Interests</Text>
              <Text style={s.sideLine}>{resume.interests}</Text>
            </>
          ) : null}
        </View>

        <View style={s.main}>
          {resume.summary ? (
            <>
              <Text style={[s.mainSectionTitle, accentStyle]}>Summary</Text>
              <Text style={s.summary}>{resume.summary}</Text>
            </>
          ) : null}

          {resume.experience.length ? (
            <>
              <Text style={[s.mainSectionTitle, accentStyle]}>Experience</Text>
              {resume.experience.map((exp, i) => (
                <View key={i} style={s.entryBlock} wrap={false}>
                  <View style={s.entryHeader}>
                    <Text style={s.entryTitle}>
                      {exp.title} · {exp.company}
                    </Text>
                    <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                  </View>
                  {exp.location ? <Text style={s.entrySub}>{exp.location}</Text> : null}
                  {exp.bullets.map((b, j) => (
                    <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          {resume.projects.length && !isHidden(resume, "projects") ? (
            <>
              <Text style={[s.mainSectionTitle, accentStyle]}>Projects</Text>
              {resume.projects.map((p, i) => (
                <View key={i} style={s.entryBlock} wrap={false}>
                  <Text style={s.entryTitle}>
                    {p.name}
                    {p.link ? `  (${p.link})` : ""}
                  </Text>
                  {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                  {p.bullets.map((b, j) => (
                    <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          <Text style={s.disclaimer}>{disclaimer}</Text>
        </View>
      </Page>
    </Document>
  );
}

/* ---------------------------------------------------------------------- */
/* Minimal — typography-first, generous whitespace, no rules/borders      */
/* ---------------------------------------------------------------------- */

const minimalStyles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937" },
  name: { fontSize: 22, fontWeight: 300, letterSpacing: 1, marginBottom: 4 },
  headline: { fontSize: 10.5, color: "#6b7280", marginBottom: 4 },
  contactRow: { fontSize: 8.5, color: "#9ca3af", marginBottom: 22 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#9ca3af",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  summary: { fontSize: 10, lineHeight: 1.6, color: "#374151" },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  entryTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#111827",
    width: "76%",
    paddingRight: 8,
  },
  entrySub: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  entryDates: { fontSize: 8.5, color: "#9ca3af", width: "24%", textAlign: "right" },
  bullet: { fontSize: 9.5, marginTop: 3, lineHeight: 1.5, color: "#374151" },
  skillsRow: { fontSize: 9.5, lineHeight: 1.8, color: "#374151" },
  disclaimer: { fontSize: 7, color: "#d1d5db", marginTop: 24 },
});

function MinimalResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = minimalStyles;
  const accentStyle = resume.accentColor ? { color: resume.accentColor } : {};
  return (
    <Document title={`${resume.fullName} - Resume`}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{resume.fullName}</Text>
        {resume.headline ? <Text style={s.headline}>{resume.headline}</Text> : null}
        {contactParts(resume).length ? (
          <Text style={s.contactRow}>{contactParts(resume).join("   ·   ")}</Text>
        ) : null}

        {resume.summary ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Summary</Text>
            <Text style={s.summary}>{resume.summary}</Text>
          </>
        ) : null}

        {resume.experience.length ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Experience</Text>
            {resume.experience.map((exp, i) => (
              <View key={i} wrap={false}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>
                    {exp.title}, {exp.company}
                  </Text>
                  <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                </View>
                {exp.location ? <Text style={s.entrySub}>{exp.location}</Text> : null}
                {exp.bullets.map((b, j) => (
                  <RichBullet key={j} text={b} style={s.bullet} />
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.projects.length && !isHidden(resume, "projects") ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Projects</Text>
            {resume.projects.map((p, i) => (
              <View key={i} wrap={false}>
                <Text style={s.entryTitle}>
                  {p.name}
                  {p.link ? `  ·  ${p.link}` : ""}
                </Text>
                {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                {p.bullets.map((b, j) => (
                  <RichBullet key={j} text={b} style={s.bullet} />
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.education.length ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Education</Text>
            {resume.education.map((ed, i) => (
              <View key={i} style={s.entryHeader}>
                <Text style={s.entryTitle}>{eduLine(ed)}</Text>
                <Text style={s.entryDates}>{dateRange(ed.startDate, ed.endDate)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {resume.skills.length ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Skills</Text>
            <Text style={s.skillsRow}>{resume.skills.join("   ·   ")}</Text>
          </>
        ) : null}

        {resume.certifications.length && !isHidden(resume, "certifications") ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Certifications</Text>
            {resume.certifications.map((c, i) => (
              <Text key={i} style={s.bullet}>
                {c.name}
                {c.issuer ? `, ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </Text>
            ))}
          </>
        ) : null}

        {resume.interests && !isHidden(resume, "extras") ? (
          <>
            <Text style={[s.sectionTitle, accentStyle]}>Interests</Text>
            <Text style={s.summary}>{resume.interests}</Text>
          </>
        ) : null}

        <Text style={s.disclaimer}>{disclaimer}</Text>
      </Page>
    </Document>
  );
}

/* ---------------------------------------------------------------------- */
/* Compact — dense two-column, no color, built to fit more onto one page  */
/* ---------------------------------------------------------------------- */

const compactStyles = StyleSheet.create({
  page: { flexDirection: "row", padding: 26, fontFamily: "Helvetica", fontSize: 8.7, color: "#111827" },
  main: { width: "66%", paddingRight: 16 },
  side: { width: "34%", borderLeft: "0.75 solid #d1d5db", paddingLeft: 14 },
  name: { fontSize: 16, fontWeight: 700, marginBottom: 1 },
  headline: { fontSize: 9, color: "#4b5563", marginBottom: 8 },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    marginTop: 9,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#111827",
  },
  summary: { fontSize: 8.7, lineHeight: 1.35 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  entryTitle: { fontSize: 9, fontWeight: 700, width: "70%", paddingRight: 6 },
  entrySub: { fontSize: 8.3, color: "#374151" },
  entryDates: { fontSize: 7.8, color: "#6b7280", width: "30%", textAlign: "right" },
  bullet: { fontSize: 8.3, marginLeft: 8, marginTop: 1.5, lineHeight: 1.3 },
  sideLine: { fontSize: 8, color: "#374151", marginBottom: 4, lineHeight: 1.35 },
  skillsRow: { fontSize: 8, lineHeight: 1.6 },
  disclaimer: { fontSize: 6.3, color: "#9ca3af", marginTop: 12, textAlign: "center" },
});

function CompactResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = compactStyles;
  return (
    <Document title={`${resume.fullName} - Resume`}>
      <Page size="A4" style={s.page}>
        <View style={s.main}>
          <Text style={s.name}>{resume.fullName}</Text>
          {resume.headline ? <Text style={s.headline}>{resume.headline}</Text> : null}

          {resume.summary ? (
            <>
              <Text style={s.sectionTitle}>Summary</Text>
              <Text style={s.summary}>{resume.summary}</Text>
            </>
          ) : null}

          {resume.experience.length ? (
            <>
              <Text style={s.sectionTitle}>Experience</Text>
              {resume.experience.map((exp, i) => (
                <View key={i} wrap={false}>
                  <View style={s.entryHeader}>
                    <Text style={s.entryTitle}>
                      {exp.title} · {exp.company}
                    </Text>
                    <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                  </View>
                  {exp.location ? <Text style={s.entrySub}>{exp.location}</Text> : null}
                  {exp.bullets.map((b, j) => (
                    <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          {resume.projects.length && !isHidden(resume, "projects") ? (
            <>
              <Text style={s.sectionTitle}>Projects</Text>
              {resume.projects.map((p, i) => (
                <View key={i} wrap={false}>
                  <Text style={s.entryTitle}>
                    {p.name}
                    {p.link ? `  (${p.link})` : ""}
                  </Text>
                  {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                  {p.bullets.map((b, j) => (
                    <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          <Text style={s.disclaimer}>{disclaimer}</Text>
        </View>

        <View style={s.side}>
          {contactParts(resume).length ? (
            <>
              <Text style={s.sectionTitle}>Contact</Text>
              {contactParts(resume).map((c, i) => (
                <Text key={i} style={s.sideLine}>
                  {c}
                </Text>
              ))}
            </>
          ) : null}

          {resume.skills.length ? (
            <>
              <Text style={s.sectionTitle}>Skills</Text>
              <Text style={s.skillsRow}>{resume.skills.join("  ·  ")}</Text>
            </>
          ) : null}

          {resume.education.length ? (
            <>
              <Text style={s.sectionTitle}>Education</Text>
              {resume.education.map((ed, i) => (
                <View key={i} style={{ marginBottom: 5 }}>
                  <Text style={s.sideLine}>{eduLine(ed)}</Text>
                  <Text style={[s.sideLine, { marginTop: -3, color: "#9ca3af" }]}>
                    {dateRange(ed.startDate, ed.endDate)}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {resume.certifications.length && !isHidden(resume, "certifications") ? (
            <>
              <Text style={s.sectionTitle}>Certifications</Text>
              {resume.certifications.map((c, i) => (
                <Text key={i} style={s.sideLine}>
                  {c.name}
                  {c.issuer ? ` — ${c.issuer}` : ""}
                </Text>
              ))}
            </>
          ) : null}

          {resume.interests && !isHidden(resume, "extras") ? (
            <>
              <Text style={s.sectionTitle}>Interests</Text>
              <Text style={s.sideLine}>{resume.interests}</Text>
            </>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

/* ---------------------------------------------------------------------- */
/* Executive — bold accent header band, single column, a bit more polish  */
/* ---------------------------------------------------------------------- */

const EXEC_ACCENT = "#1e293b";

const executiveStyles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.8, color: "#111827" },
  band: { padding: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bandText: { flex: 1 },
  name: { fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 3 },
  headline: { fontSize: 11, color: "#e2e8f0", marginBottom: 6 },
  contactRow: { fontSize: 8.7, color: "#cbd5e1" },
  photo: { width: 60, height: 60, borderRadius: 30, marginLeft: 16 },
  body: { padding: 34, paddingTop: 22 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summary: { fontSize: 9.8, lineHeight: 1.5 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  entryTitle: { fontSize: 10.3, fontWeight: 700, width: "76%", paddingRight: 8 },
  entrySub: { fontSize: 9, color: "#4b5563" },
  entryDates: { fontSize: 8.7, color: "#6b7280", width: "24%", textAlign: "right" },
  bullet: { fontSize: 9.3, marginLeft: 10, marginTop: 2.5, lineHeight: 1.4 },
  skillsRow: { fontSize: 9.3, lineHeight: 1.6 },
  disclaimer: { fontSize: 7, color: "#9ca3af", marginTop: 18, textAlign: "center" },
});

function ExecutiveResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = executiveStyles;
  const accent = resume.accentColor || EXEC_ACCENT;
  const accentStyle = { color: accent };
  return (
    <Document title={`${resume.fullName} - Resume`}>
      <Page size="A4" style={s.page}>
        <View style={[s.band, { backgroundColor: accent }]}>
          <View style={s.bandText}>
            <Text style={s.name}>{resume.fullName}</Text>
            {resume.headline ? <Text style={s.headline}>{resume.headline}</Text> : null}
            {contactParts(resume).length ? (
              <Text style={s.contactRow}>{contactParts(resume).join("   |   ")}</Text>
            ) : null}
          </View>
          {resume.photoDataUrl ? <Image src={resume.photoDataUrl} style={s.photo} /> : null}
        </View>

        <View style={s.body}>
          {resume.summary ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Summary</Text>
              <Text style={s.summary}>{resume.summary}</Text>
            </>
          ) : null}

          {resume.experience.length ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Experience</Text>
              {resume.experience.map((exp, i) => (
                <View key={i} wrap={false}>
                  <View style={s.entryHeader}>
                    <Text style={s.entryTitle}>
                      {exp.title} · {exp.company}
                    </Text>
                    <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                  </View>
                  {exp.location ? <Text style={s.entrySub}>{exp.location}</Text> : null}
                  {exp.bullets.map((b, j) => (
                    <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          {resume.projects.length && !isHidden(resume, "projects") ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Projects</Text>
              {resume.projects.map((p, i) => (
                <View key={i} wrap={false}>
                  <Text style={s.entryTitle}>
                    {p.name}
                    {p.link ? `  (${p.link})` : ""}
                  </Text>
                  {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                  {p.bullets.map((b, j) => (
                    <RichBullet key={j} text={b} style={s.bullet} prefix="• " />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          {resume.education.length ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Education</Text>
              {resume.education.map((ed, i) => (
                <View key={i} style={s.entryHeader}>
                  <Text style={s.entryTitle}>{eduLine(ed)}</Text>
                  <Text style={s.entryDates}>{dateRange(ed.startDate, ed.endDate)}</Text>
                </View>
              ))}
            </>
          ) : null}

          {resume.skills.length ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Skills</Text>
              <Text style={s.skillsRow}>{resume.skills.join("  ·  ")}</Text>
            </>
          ) : null}

          {resume.certifications.length && !isHidden(resume, "certifications") ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Certifications</Text>
              {resume.certifications.map((c, i) => (
                <Text key={i} style={s.bullet}>
                  • {c.name}
                  {c.issuer ? ` — ${c.issuer}` : ""}
                  {c.date ? ` (${c.date})` : ""}
                </Text>
              ))}
            </>
          ) : null}

          {resume.interests && !isHidden(resume, "extras") ? (
            <>
              <Text style={[s.sectionTitle, accentStyle]}>Interests</Text>
              <Text style={s.summary}>{resume.interests}</Text>
            </>
          ) : null}

          <Text style={s.disclaimer}>{disclaimer}</Text>
        </View>
      </Page>
    </Document>
  );
}

/* ---------------------------------------------------------------------- */

export function ResumePdfDocument({ resume }: { resume: TailoredResume }) {
  switch (resume.templateId) {
    case "modern":
      return <ModernResumeDocument resume={resume} />;
    case "minimal":
      return <MinimalResumeDocument resume={resume} />;
    case "compact":
      return <CompactResumeDocument resume={resume} />;
    case "executive":
      return <ExecutiveResumeDocument resume={resume} />;
    case "classic":
    default:
      return <ClassicResumeDocument resume={resume} />;
  }
}
