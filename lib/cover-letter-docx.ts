import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import { CoverLetter, TailoredResume, TemplateId } from "@/types/resume";

// Mirrors the resume's own template/accent choice — same "matching set"
// idea as the PDF cover letter, no separate picker needed.
const ACCENT_DEFAULTS: Record<TemplateId, string> = {
  classic: "111827",
  modern: "2563EB",
  minimal: "9CA3AF",
  compact: "111827",
  executive: "1E293B",
};
const NO_ACCENT: TemplateId[] = ["classic", "compact"];

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
  const hasAccent = !NO_ACCENT.includes(resume.templateId);
  const accent = (resume.accentColor || ACCENT_DEFAULTS[resume.templateId]).replace(/^#/, "").toUpperCase();

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: resume.fullName, bold: true, size: 30, color: hasAccent ? accent : "111827" }),
      ],
    }),
  ];

  if (contactLine(resume)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactLine(resume), size: 18, color: "4B5563" })],
        spacing: { after: hasAccent ? 100 : 240 },
      })
    );
  }

  if (hasAccent) {
    children.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 1 } },
        spacing: { after: 200 },
        children: [new TextRun({ text: "" })],
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
