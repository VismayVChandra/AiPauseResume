import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { TailoredResume } from "@/types/resume";

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
  entryTitle: { fontSize: 10.5, fontWeight: 700 },
  entrySub: { fontSize: 9.5, color: "#374151" },
  entryDates: { fontSize: 9, color: "#6b7280" },
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
                  <Text key={j} style={s.bullet}>
                    • {b}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.projects.length ? (
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
                  <Text key={j} style={s.bullet}>
                    • {b}
                  </Text>
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

        {resume.certifications.length ? (
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

        {resume.interests ? (
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
  entryTitle: { fontSize: 10.5, fontWeight: 700, color: "#111827", lineHeight: 1.35 },
  entrySub: { fontSize: 9, color: "#4b5563", marginTop: 1, marginBottom: 4 },
  entryDates: { fontSize: 8.5, color: "#6b7280" },
  bullet: { fontSize: 9.2, marginLeft: 9, marginTop: 4, lineHeight: 1.5, color: "#1f2937" },
  disclaimer: { fontSize: 6.5, color: "#9ca3af", marginTop: 22 },
});

function ModernResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = modernStyles;
  return (
    <Document title={`${resume.fullName} - Resume`}>
      <Page size="A4" style={s.page}>
        <View style={s.sidebar}>
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

          {resume.certifications.length ? (
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

          {resume.interests ? (
            <>
              <Text style={s.sideSectionTitle}>Interests</Text>
              <Text style={s.sideLine}>{resume.interests}</Text>
            </>
          ) : null}
        </View>

        <View style={s.main}>
          {resume.summary ? (
            <>
              <Text style={s.mainSectionTitle}>Summary</Text>
              <Text style={s.summary}>{resume.summary}</Text>
            </>
          ) : null}

          {resume.experience.length ? (
            <>
              <Text style={s.mainSectionTitle}>Experience</Text>
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
                    <Text key={j} style={s.bullet}>
                      • {b}
                    </Text>
                  ))}
                </View>
              ))}
            </>
          ) : null}

          {resume.projects.length ? (
            <>
              <Text style={s.mainSectionTitle}>Projects</Text>
              {resume.projects.map((p, i) => (
                <View key={i} style={s.entryBlock} wrap={false}>
                  <Text style={s.entryTitle}>
                    {p.name}
                    {p.link ? `  (${p.link})` : ""}
                  </Text>
                  {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                  {p.bullets.map((b, j) => (
                    <Text key={j} style={s.bullet}>
                      • {b}
                    </Text>
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
  entryTitle: { fontSize: 10.5, fontWeight: 700, color: "#111827" },
  entrySub: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  entryDates: { fontSize: 8.5, color: "#9ca3af" },
  bullet: { fontSize: 9.5, marginTop: 3, lineHeight: 1.5, color: "#374151" },
  skillsRow: { fontSize: 9.5, lineHeight: 1.8, color: "#374151" },
  disclaimer: { fontSize: 7, color: "#d1d5db", marginTop: 24 },
});

function MinimalResumeDocument({ resume }: { resume: TailoredResume }) {
  const s = minimalStyles;
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
                    {exp.title}, {exp.company}
                  </Text>
                  <Text style={s.entryDates}>{dateRange(exp.startDate, exp.endDate)}</Text>
                </View>
                {exp.location ? <Text style={s.entrySub}>{exp.location}</Text> : null}
                {exp.bullets.map((b, j) => (
                  <Text key={j} style={s.bullet}>
                    {b}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.projects.length ? (
          <>
            <Text style={s.sectionTitle}>Projects</Text>
            {resume.projects.map((p, i) => (
              <View key={i} wrap={false}>
                <Text style={s.entryTitle}>
                  {p.name}
                  {p.link ? `  ·  ${p.link}` : ""}
                </Text>
                {p.description ? <Text style={s.entrySub}>{p.description}</Text> : null}
                {p.bullets.map((b, j) => (
                  <Text key={j} style={s.bullet}>
                    {b}
                  </Text>
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
            <Text style={s.skillsRow}>{resume.skills.join("   ·   ")}</Text>
          </>
        ) : null}

        {resume.certifications.length ? (
          <>
            <Text style={s.sectionTitle}>Certifications</Text>
            {resume.certifications.map((c, i) => (
              <Text key={i} style={s.bullet}>
                {c.name}
                {c.issuer ? `, ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </Text>
            ))}
          </>
        ) : null}

        {resume.interests ? (
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

export function ResumePdfDocument({ resume }: { resume: TailoredResume }) {
  switch (resume.templateId) {
    case "modern":
      return <ModernResumeDocument resume={resume} />;
    case "minimal":
      return <MinimalResumeDocument resume={resume} />;
    case "classic":
    default:
      return <ClassicResumeDocument resume={resume} />;
  }
}
