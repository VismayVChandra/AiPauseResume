import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CoverLetter, TailoredResume } from "@/types/resume";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  name: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  contactRow: { fontSize: 9.5, color: "#4b5563", marginBottom: 20 },
  date: { fontSize: 10.5, color: "#374151", marginBottom: 18 },
  greeting: { fontSize: 11, marginBottom: 12 },
  paragraph: { fontSize: 11, lineHeight: 1.55, marginBottom: 12 },
  signOff: { fontSize: 11, marginTop: 8 },
  signName: { fontSize: 11, fontWeight: 700, marginTop: 18 },
  disclaimer: { fontSize: 7, color: "#9ca3af", marginTop: 28, textAlign: "center" },
});

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
  return (
    <Document title={`${resume.fullName} - Cover Letter`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{resume.fullName}</Text>
        {contactLine(resume) ? <Text style={styles.contactRow}>{contactLine(resume)}</Text> : null}

        <Text style={styles.date}>{today()}</Text>

        <Text style={styles.greeting}>{coverLetter.greeting}</Text>

        {coverLetter.paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}

        <View>
          <Text style={styles.signOff}>{coverLetter.signOff}</Text>
          <Text style={styles.signName}>{resume.fullName}</Text>
        </View>

        <Text style={styles.disclaimer}>
          Generated with AI assistance — review all details for accuracy before submitting.
        </Text>
      </Page>
    </Document>
  );
}
