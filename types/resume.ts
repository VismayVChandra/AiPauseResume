// Shared data contracts. AIService, the DB layer, the review form, and the
// PDF/DOCX exporters all read/write these exact shapes — keep them in sync
// with the zod schemas in lib/schemas.ts.

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
}

export interface Experience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string; // "Present" allowed
  location?: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  description?: string;
  bullets: string[];
  link?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  date?: string;
}

// Available resume layouts, chosen up front on the template step.
export type TemplateId = "classic" | "modern" | "minimal";

export const TEMPLATE_OPTIONS: { id: TemplateId; name: string; description: string }[] = [
  {
    id: "classic",
    name: "Classic ATS",
    description: "Single column, no color, maximum ATS compatibility.",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Accent color, sidebar for skills & contact — a bit more visual.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Light typography-first layout with generous whitespace.",
  },
];

// Output of AIService.extractProfile — neutral, un-tailored. This is what
// gets stored in career_profiles.profile_json so the same profile can be
// re-tailored for a different role later without re-uploading.
export interface RawProfile {
  fullName: string;
  headline?: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  experience: Experience[];
  education: Education[];
  projects: ProjectItem[];
  skills: string[];
  certifications: Certification[];
}

// Output of AIService.tailorResume — same shape as RawProfile, but
// filtered/reordered/rewritten toward targetRole, plus a few fields the
// review screen adds that LinkedIn never exports.
export interface TailoredResume {
  targetRole: string;
  templateId: TemplateId;
  fullName: string;
  headline: string;
  contact: RawProfile["contact"];
  summary: string;               // AI-written, tailored to the role
  experience: Experience[];      // reordered + rewritten bullets
  education: Education[];
  projects: ProjectItem[];
  skills: string[];              // reordered so most relevant show first
  certifications: Certification[];
  // Fields LinkedIn doesn't export — start empty, user fills on the review screen
  interests: string;
  portfolioLink: string;
  // AI transparency, per the safety rules: what the role seems to want that
  // isn't backed by anything in the source profile. Never silently invented.
  missingForRole: string[];
}

export const EMPTY_TAILORED_RESUME: TailoredResume = {
  targetRole: "",
  templateId: "classic",
  fullName: "",
  headline: "",
  contact: {},
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  interests: "",
  portfolioLink: "",
  missingForRole: [],
};

// A single predicted interview question, grounded in something specific on
// the tailored resume (a bullet, a project, or a missingForRole gap) — never
// generic ("tell me about yourself") and never about invented experience.
export interface InterviewQuestion {
  question: string;
  basedOn: string;
  tip: string;
}

// A scored sub-category (ATS compatibility, role match, skills match) —
// each carries its own 0-100 score plus a few short notes explaining it,
// so the UI can show "why" next to every number.
export interface ScoreCategory {
  score: number; // 0-100
  notes: string[];
}

// Job-specific resume scoring, produced by AIService.scoreResume against a
// TailoredResume's own targetRole — never a generic, role-agnostic score.
export interface ResumeScore {
  overallScore: number; // 0-100
  atsCompatibility: ScoreCategory;
  roleMatch: ScoreCategory;
  skillsMatch: ScoreCategory;
  missingKeywords: string[];
  strengths: string[];
  areasToImprove: string[];
  suggestions: string[];
}
