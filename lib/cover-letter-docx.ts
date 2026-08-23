import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { CoverLetter, TailoredResume } from "@/types/resume";

function contactLine(resume: TailoredResume): string {
  return [resume.contact.email, resume.contact.phone, resume.contact.location]
    .filter(Boolean)
    .join("   |   ");
}

const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

// Same underlying CoverLetter object that feeds the PDF template, per the
// same "one data source, no drift" pattern as the resume exports.
export async function buildCoverLetterDocx(
  resume: TailoredResume,
  coverLetter: CoverLetter
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: resume.fullName, bold: true, size: 30 })],
    }),
  ];

  if (contactLine(resume)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactLine(resume), size: 18, color: "4B5563" })],
        spacing: { after: 240 },
      })
    );
  }

  children.push(new Paragraph({ text: today(), spacing: { after: 200 } }));
  children.push(new Paragraph({ text: coverLetter.greeting, spacing: { after: 160 } }));

  for (const p of coverLetter.paragraphs) {
    children.push(new Paragraph({ text: p, spacing: { after: 160 }, alignment: AlignmentType.LEFT }));
  }

  children.push(
    new Paragraph({ text: coverLetter.signOff, spacing: { before: 100 } }),
    new Paragraph({
      children: [new TextRun({ text: resume.fullName, bold: true })],
      spacing: { before: 240 },
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: "Generated with AI assistance — review all details for accuracy before submitting.",
          size: 14,
          color: "9CA3AF",
        }),
      ],
    })
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
