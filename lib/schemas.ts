import { z } from "zod";

// These mirror types/resume.ts exactly. AIService validates every AI
// response against these before it's allowed to touch the database or UI —
// "never parse free-form AI text for app logic" from the spec.

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string().optional().default(""),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  details: z.string().optional(),
});

export const ExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  bullets: z.array(z.string()),
});

export const ProjectItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  bullets: z.array(z.string()),
  link: z.string().optional(),
});

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

export const RawProfileSchema = z.object({
  fullName: z.string(),
  headline: z.string().optional(),
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
  }),
  summary: z.string().optional(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  projects: z.array(ProjectItemSchema),
  skills: z.array(z.string()),
  certifications: z.array(CertificationSchema),
});

export const TailoredResumeSchema = z.object({
  targetRole: z.string(),
  templateId: z.enum(["classic", "modern", "minimal"]).default("classic"),
  fullName: z.string(),
  headline: z.string(),
  contact: RawProfileSchema.shape.contact,
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  projects: z.array(ProjectItemSchema),
  skills: z.array(z.string()),
  certifications: z.array(CertificationSchema),
  interests: z.string().default(""),
  portfolioLink: z.string().default(""),
  missingForRole: z.array(z.string()).default([]),
  hiddenSections: z.array(z.string()).default([]),
  accentColor: z.string().optional(),
});

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  basedOn: z.string(),
  tip: z.string(),
});

export const InterviewQuestionsSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(5).max(8),
});

export const ScoreCategorySchema = z.object({
  score: z.number().min(0).max(100),
  notes: z.array(z.string()).default([]),
});

export const ResumeScoreSchema = z.object({
  overallScore: z.number().min(0).max(100),
  atsCompatibility: ScoreCategorySchema,
  roleMatch: ScoreCategorySchema,
  skillsMatch: ScoreCategorySchema,
  missingKeywords: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  areasToImprove: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export const CoverLetterSchema = z.object({
  greeting: z.string(),
  paragraphs: z.array(z.string()).min(1),
  signOff: z.string(),
});

export const BulletVariantsSchema = z.object({
  variants: z.array(z.string()).min(1).max(4),
});
