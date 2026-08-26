import { TailoredResume } from "@/types/resume";

// Some ATS portals specifically want a plain-text paste rather than a PDF
// or DOCX upload — this is that format: no styling, no columns, nothing
// that could confuse a naive parser. Same data as every other export, so
// it can never drift from what's actually on the resume.

function dateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" - ");
}

function eduLine(ed: { degree: string; field?: string; institution: string }): string {
  const degreeField = [ed.degree, ed.field].filter(Boolean).join(", ");
  return [degreeField, ed.institution].filter(Boolean).join(" - ");
}

function isHidden(resume: TailoredResume, section: "projects" | "certifications" | "extras") {
  return resume.hiddenSections.includes(section);
}

// Bold/italic markers (**text**, _text_) are meaningless in plain text —
// strip them rather than leaving literal asterisks/underscores in the output.
function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/_(.+?)_/g, "$1");
}

export function buildResumeTxt(resume: TailoredResume): string {
  const lines: string[] = [];

  lines.push(resume.fullName.toUpperCase());
  if (resume.headline) lines.push(resume.headline);
  const contactParts = [
    resume.contact.location,
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.portfolioLink,
  ].filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join(" | "));

  if (resume.summary) {
    lines.push("", "SUMMARY", resume.summary);
  }

  if (resume.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const exp of resume.experience) {
      lines.push("");
      lines.push(`${exp.title}${exp.company ? " - " + exp.company : ""}`);
      const meta = [exp.location, dateRange(exp.startDate, exp.endDate)].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      for (const b of exp.bullets) lines.push(`- ${stripInlineMarkdown(b)}`);
    }
  }

  if (resume.projects.length && !isHidden(resume, "projects")) {
    lines.push("", "PROJECTS");
    for (const p of resume.projects) {
      lines.push("");
      lines.push(p.name + (p.link ? ` (${p.link})` : ""));
      if (p.description) lines.push(p.description);
      for (const b of p.bullets) lines.push(`- ${stripInlineMarkdown(b)}`);
    }
  }

  if (resume.education.length) {
    lines.push("", "EDUCATION");
    for (const ed of resume.education) {
      const dates = dateRange(ed.startDate, ed.endDate);
      lines.push(eduLine(ed) + (dates ? ` (${dates})` : ""));
    }
  }

  if (resume.skills.length) {
    lines.push("", "SKILLS", resume.skills.join(", "));
  }

  if (resume.certifications.length && !isHidden(resume, "certifications")) {
    lines.push("", "CERTIFICATIONS");
    for (const c of resume.certifications) {
      lines.push(`- ${c.name}${c.issuer ? " - " + c.issuer : ""}${c.date ? ` (${c.date})` : ""}`);
    }
  }

  if (resume.interests && !isHidden(resume, "extras")) {
    lines.push("", "INTERESTS", resume.interests);
  }

  return lines.join("\n").trim() + "\n";
}
