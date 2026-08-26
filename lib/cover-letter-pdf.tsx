import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CoverLetter, TailoredResume, TemplateId } from "@/types/resume";

// Mirrors the resume's own template identity rather than offering a
// separate cover-letter template picker — the two are meant to read as a
// matching set, and reusing resume.templateId/accentColor means this
// updates automatically with zero extra UI.
const ACCENT_DEFAULTS: Record<TemplateId, string> = {
  classic: "#111827",
  modern: "#2563eb",
  minimal: "#9ca3af",
  compact: "#111827",
  executive: "#1e293b",
};

// Same "no color, max ATS" rule as the resume templates themselves.
const NO_ACCENT: TemplateId[] = ["classic", "compact"];
const BANDED: TemplateId[] = ["executive"];

function contactLine(resume: TailoredResume): string {
  return [resume.contact.email, resume.contact.phone, resume.contact.location]
    .filter(Boolean)
    .join("   |   ");
}

const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export function CoverLetterPdfDocument({
  resume,
  coverLetter,
}: {
  resume: TailoredResume;
  coverLetter: CoverLetter;
}) {
  const hasAccent = !NO_ACCENT.includes(resume.templateId);
  const banded = BANDED.includes(resume.templateId);
  const accent = resume.accentColor || ACCENT_DEFAULTS[resume.templateId];

  const s = StyleSheet.create({
    page: { fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
    body: { padding: 48 },
    band: { backgroundColor: accent, padding: 32, marginBottom: 16 },
    name: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 2,
      color: banded ? "#ffffff" : hasAccent ? accent : "#111827",
    },
    contactRow: { fontSize: 9.5, color: banded ? "#e2e8f0" : "#4b5563", marginBottom: banded ? 0 : 20 },
    rule: hasAccent && !banded ? { height: 2, width: 56, backgroundColor: accent, marginBottom: 18 } : {},
    date: { fontSize: 10.5, color: "#374151", marginBottom: 18, marginTop: banded ? 24 : 0 },
    greeting: { fontSize: 11, marginBottom: 12 },
    paragraph: { fontSize: 11, lineHeight: 1.55, marginBottom: 12 },
    signOff: { fontSize: 11, marginTop: 8 },
    signName: { fontSize: 11, fontWeight: 700, marginTop: 18 },
    disclaimer: { fontSize: 7, color: "#9ca3af", marginTop: 28, textAlign: "center" },
  });

  return (
    <Document title={`${resume.fullName} - Cover Letter`}>
      <Page size="A4" style={s.page}>
        {banded ? (
          <View style={s.band}>
            <Text style={s.name}>{resume.fullName}</Text>
            {contactLine(resume) ? <Text style={s.contactRow}>{contactLine(resume)}</Text> : null}
          </View>
        ) : null}

        <View style={s.body}>
          {!banded ? (
            <>
              <Text style={s.name}>{resume.fullName}</Text>
              {contactLine(resume) ? <Text style={s.contactRow}>{contactLine(resume)}</Text> : null}
              {hasAccent ? <View style={s.rule} /> : null}
            </>
          ) : null}

          <Text style={s.date}>{today()}</Text>

          <Text style={s.greeting}>{coverLetter.greeting}</Text>

          {coverLetter.paragraphs.map((p, i) => (
            <Text key={i} style={s.paragraph}>
              {p}
            </Text>
          ))}

          <View>
            <Text style={s.signOff}>{coverLetter.signOff}</Text>
            <Text style={s.signName}>{resume.fullName}</Text>
          </View>

          <Text style={s.disclaimer}>
            Generated with AI assistance — review all details for accuracy before submitting.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
