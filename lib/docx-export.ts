import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
} from "docx";
import { TailoredResume, TemplateId } from "@/types/resume";
import { parseInlineMarkdown } from "@/lib/rich-text";

function dateRange(start?: string, end?: string) {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" – ");
}

function eduLine(ed: { degree: string; field?: string; institution: string }) {
  const degreeField = [ed.degree, ed.field].filter(Boolean).join(", ");
  return [degreeField, ed.institution].filter(Boolean).join(" · ");
}

// Per-template visual theme. DOCX can't reproduce the PDF's sidebar layout
// without heavier table gymnastics, so "modern" and "minimal" differentiate
// through color, borders, and heading weight instead — still three visibly
// distinct documents, all built from the same buildResumeDocx() below.
type Theme = {
  nameColor: string;
  nameSize: number;
  accent: string;
  headingBorder: boolean;
  headingUppercase: boolean;
};

const THEMES: Record<TemplateId, Theme> = {
  classic: { nameColor: "111827", nameSize: 40, accent: "111827", headingBorder: true, headingUppercase: true },
  modern: { nameColor: "1D4ED8", nameSize: 42, accent: "2563EB", headingBorder: true, headingUppercase: true },
  minimal: { nameColor: "1F2937", nameSize: 36, accent: "9CA3AF", headingBorder: false, headingUppercase: true },
  compact: { nameColor: "111827", nameSize: 34, accent: "111827", headingBorder: true, headingUppercase: true },
  executive: { nameColor: "1E293B", nameSize: 40, accent: "1E293B", headingBorder: true, headingUppercase: true },
};

// DOCX has no reliable way to read an embedded image's pixel dimensions
// without a decoder dependency, so photos render at a fixed square size —
// close enough for a small headshot, and matches the PDF's fixed circle.
const PHOTO_SIZE = 90;

function decodePhoto(dataUrl: string): Buffer | null {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
}

function sectionHeading(text: string, theme: Theme) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: theme.headingBorder
      ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" } }
      : undefined,
    children: [
      new TextRun({
        text: theme.headingUppercase ? text.toUpperCase() : text,
        bold: true,
        size: 20,
        color: theme.accent,
      }),
    ],
  });
}

// Turns **bold**/_italic_ markers into styled runs within the bullet
// paragraph, same source-of-truth parser the PDF template uses.
function bullet(text: string) {
  const runs = parseInlineMarkdown(text).map(
    (seg) => new TextRun({ text: seg.text, bold: seg.bold, italics: seg.italic })
  );
  return new Paragraph({ children: runs, bullet: { level: 0 }, spacing: { after: 80 } });
}

// Same underlying resume object that feeds the PDF template — the spec
// requires both exports come from one data source, not two renderers that
// could drift apart.
export async function buildResumeDocx(resume: TailoredResume): Promise<Buffer> {
  const baseTheme = THEMES[resume.templateId] || THEMES.classic;
  // Classic never picks up a custom accent — same "no color, max ATS" rule
  // as the PDF template.
  const theme: Theme =
    resume.templateId !== "classic" && resume.accentColor
      ? { ...baseTheme, accent: resume.accentColor.replace(/^#/, "").toUpperCase() }
      : baseTheme;
  const contactParts = [
    resume.contact.location,
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.portfolioLink,
  ].filter(Boolean) as string[];

  const children: Paragraph[] = [];

  // Photo only renders for the two templates with a photo slot in the PDF
  // (modern, executive) — kept consistent between the two exports.
  if (resume.photoDataUrl && (resume.templateId === "modern" || resume.templateId === "executive")) {
    const photoBuffer = decodePhoto(resume.photoDataUrl);
    if (photoBuffer) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new ImageRun({
              data: photoBuffer,
              transformation: { width: PHOTO_SIZE, height: PHOTO_SIZE },
            }),
          ],
        })
      );
    }
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: resume.fullName, bold: true, size: theme.nameSize, color: theme.nameColor })],
    })
  );

  if (resume.headline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: resume.headline, size: 22, color: "374151" })],
        spacing: { after: 60 },
      })
    );
  }

  if (contactParts.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join("   |   "), size: 18, color: "4B5563" })],
        spacing: { after: 120 },
      })
    );
  }

  if (resume.summary) {
    children.push(sectionHeading("Summary", theme));
    children.push(new Paragraph({ text: resume.summary, spacing: { after: 140 } }));
  }

  if (resume.experience.length) {
    children.push(sectionHeading("Experience", theme));
    for (const exp of resume.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 180 },
          children: [
            new TextRun({ text: `${exp.title} · ${exp.company}`, bold: true, size: 21 }),
            new TextRun({
              text: `   ${dateRange(exp.startDate, exp.endDate)}`,
              italics: true,
              size: 18,
              color: "6B7280",
            }),
          ],
        })
      );
      if (exp.location) {
        children.push(new Paragraph({ text: exp.location, spacing: { after: 40 } }));
      }
      exp.bullets.forEach((b) => children.push(bullet(b)));
    }
  }

  if (resume.projects.length && !resume.hiddenSections.includes("projects")) {
    children.push(sectionHeading("Projects", theme));
    for (const p of resume.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 180 },
          children: [
            new TextRun({ text: p.name, bold: true, size: 21 }),
            ...(p.link ? [new TextRun({ text: `  (${p.link})`, size: 18, color: "6B7280" })] : []),
          ],
        })
      );
      if (p.description) children.push(new Paragraph({ text: p.description }));
      p.bullets.forEach((b) => children.push(bullet(b)));
    }
  }

  if (resume.education.length) {
    children.push(sectionHeading("Education", theme));
    for (const ed of resume.education) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({
              text: eduLine(ed),
              bold: true,
              size: 21,
            }),
            new TextRun({
              text: `   ${dateRange(ed.startDate, ed.endDate)}`,
              italics: true,
              size: 18,
              color: "6B7280",
            }),
          ],
        })
      );
    }
  }

  if (resume.skills.length) {
    children.push(sectionHeading("Skills", theme));
    children.push(new Paragraph({ text: resume.skills.join("  ·  ") }));
  }

  if (resume.certifications.length && !resume.hiddenSections.includes("certifications")) {
    children.push(sectionHeading("Certifications", theme));
    resume.certifications.forEach((c) =>
      children.push(
        bullet(`${c.name}${c.issuer ? " — " + c.issuer : ""}${c.date ? ` (${c.date})` : ""}`)
      )
    );
  }

  if (resume.interests && !resume.hiddenSections.includes("extras")) {
    children.push(sectionHeading("Interests", theme));
    children.push(new Paragraph({ text: resume.interests }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
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
