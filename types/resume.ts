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
export type TemplateId = "classic" | "modern" | "minimal" | "compact" | "executive";

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
  {
    id: "compact",
    name: "Compact",
    description: "Dense two-column layout, no color — fits more onto one page.",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Bold accent header band, single column, a bit more polish.",
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
  // Layout preferences — user-controlled, never set by the AI (guarded in
  // ai-service.ts the same way templateId/interests/portfolioLink are).
  // Keys are section ids: "projects" | "certifications" | "extras".
  hiddenSections: string[];
  // Hex color, only meaningful for templates that use an accent color
  // (modern, minimal, executive) — omitted/empty means "use that
  // template's default".
  accentColor?: string;
  // Optional headshot as a base64 data URI (png/jpeg only, size-capped
  // client-side) — user-uploaded, never touched by the AI. Only rendered
  // by templates with a photo slot (modern, executive); stored regardless
  // of the active template so switching back doesn't lose it.
  photoDataUrl?: string;
}

// Output of AIService.generateCoverLetter — plain paragraphs, no markup.
// Same anti-fabrication rule as tailoring: grounded only in the resume
// it's generated from.
export interface CoverLetter {
  greeting: string; // e.g. "Dear Hiring Manager,"
  paragraphs: string[];
  signOff: string; // e.g. "Sincerely,"
}

// A saved snapshot of a resume, taken at a meaningful checkpoint (initial
// tailoring, before an AI improvement is applied) so a user can see what
// changed and revert if a rewrite made things worse, not just better.
export interface ResumeVersion {
  id: string;
  label: string;
  resume: TailoredResume;
  createdAt: string;
}

// Deterministic (non-AI) comparison between a resume and a pasted job
// description — literal term overlap, not a model's judgment call.
export interface KeywordMatchResult {
  coveragePct: number;
  covered: string[];
  missing: string[];
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
  hiddenSections: [],
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

// Output of AIService.optimizeLinkedIn — a suggested LinkedIn headline and
// About section, grounded only in the tailored resume it's generated from.
export interface LinkedInOptimization {
  headline: string;
  about: string;
}

// Output of AIService.evaluateInterviewAnswer — feedback on one typed mock
// interview answer, judged against the STAR framework (Situation, Task,
// Action, Result) and grounded only in what the person actually wrote.
export interface InterviewAnswerFeedback {
  starClarity: string; // one short line on how clearly Situation/Task/Action/Result come through
  strengths: string[];
  improvements: string[];
  suggestedRewrite: string; // a tightened version of the SAME answer, no new claims added
}

// Deterministic (non-AI) gap found between two consecutive experience
// entries once sorted chronologically — pure date math, not a model's
// judgment call.
export interface TimelineGap {
  beforeLabel: string; // the earlier role, e.g. "Engineer @ Acme"
  afterLabel: string; // the later role that follows the gap
  months: number;
}

// One snapshot of ResumeScore's numbers, taken every time the resume is
// scored — lets the score screen chart whether edits are actually moving
// the needle over a series of runs, not just the immediate before/after
// of a single "Improve My Score" pass.
export interface ScoreHistoryEntry {
  id: string;
  overallScore: number;
  atsScore: number;
  roleMatchScore: number;
  skillsMatchScore: number;
  createdAt: string;
}

// Per-resume application-tracking metadata — user-entered, never touched
// by the AI. Lives alongside resume_json in the resumes table.
export type ApplicationStatus = "not_applied" | "applied" | "interviewing" | "offer" | "rejected";

export const APPLICATION_STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "not_applied", label: "Not applied" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];
