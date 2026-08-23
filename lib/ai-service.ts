import { GoogleGenAI } from "@google/genai";
import { RawProfile, TailoredResume, InterviewQuestion, ResumeScore } from "@/types/resume";
import {
  RawProfileSchema,
  TailoredResumeSchema,
  InterviewQuestionsSchema,
  ResumeScoreSchema,
} from "@/lib/schemas";

const MODEL = "gemini-3.5-flash-lite";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local — see .env.example."
    );
  }
  return new GoogleGenAI({ apiKey });
}

// Strips ```json fences etc. in case the model wraps its output despite
// instructions not to — belt and suspenders before zod validation.
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

async function callStrictJson(system: string, user: string): Promise<unknown> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI response contained no text content.");
  }
  return extractJson(text);
}

const EXTRACT_SYSTEM_PROMPT = `You extract structured career data from a person's LinkedIn export or pasted profile text.

Rules (must follow exactly):
- Output ONLY valid JSON matching the schema below. No preamble, no markdown fences, no commentary.
- Never invent employers, titles, dates, schools, skills, certifications, or metrics that are not present in the source text.
- If a field is not present in the source text, omit it (for optional fields) or use an empty string/array — never guess or fabricate a plausible-sounding value.
- Preserve the factual content of each bullet point; you may lightly clean up formatting/whitespace but do not add new claims.
- Do not tailor or reorder anything toward any particular job — this is the neutral, un-tailored extraction step.

JSON schema:
{
  "fullName": string,
  "headline": string (optional),
  "contact": { "email"?: string, "phone"?: string, "location"?: string, "linkedin"?: string },
  "summary": string (optional, only if a summary/about section exists in the source),
  "experience": [{ "company": string, "title": string, "startDate"?: string, "endDate"?: string, "location"?: string, "bullets": string[] }],
  // "education": [{ "institution": string, "degree": string, "field"?: string, "startDate"?: string, "endDate"?: string, "details"?: string }],
  "education": [{ "institution": string, "degree"?: string (e.g. "B.Tech", "CBSE", "PCMC" — use whatever level/qualification label the source gives, or omit if none is stated), "field"?: string, "startDate"?: string, "endDate"?: string, "details"?: string }],
  "projects": [{ "name": string, "description"?: string, "bullets": string[], "link"?: string }],
  "skills": string[],
  "certifications": [{ "name": string, "issuer"?: string, "date"?: string }]
}`;

const TAILOR_SYSTEM_PROMPT = `You tailor a neutral career profile into a resume aimed at a specific target role.

Rules (must follow exactly):
- Output ONLY valid JSON matching the schema below. No preamble, no markdown fences, no commentary.
- You may ONLY use facts already present in the source profile: companies, titles, dates, schools, skills, certifications, and metrics. Never invent or embellish any of these, even if they would "fit" the target role well.
- You MAY: reorder experience/projects/skills by relevance to the target role, select which bullets to lead with, and rewrite bullet wording/emphasis to speak to the target role — as long as the underlying facts are unchanged.
- You MAY NOT: add a skill, tool, metric, employer, or accomplishment that isn't already in the source data, even implicitly.
- Skills list: include everything in the source profile's tagged skills, PLUS any concrete skill/tool/technique explicitly named in an experience or project bullet (e.g. a bullet that says "using SolidWorks" or "led CAD modeling" means SolidWorks / CAD modeling can appear in skills, since it's stated, not invented). Do not add a skill only implied or typical for the role — it must be named somewhere in the source text. Deduplicate and put the skills most relevant to the target role first.
- Write a short (2-4 sentence) professional summary tailored to the target role, using only claims supported by the source profile. Write it in confident first-person-implied resume voice (no "X is a..." third-person biography style, no name repetition) — lead with what's most relevant to the target role, not a generic life story.
- Rewrite bullets to be tight, results-oriented, and specific: start with a strong verb, cut filler phrases ("I actively contribute to...", "through this experience I gained..."), and keep any real number/metric from the source but do not fabricate new ones. Prefer one sharp sentence over two vague ones covering the same ground. If two source bullets say near-duplicate things, merge them into one stronger bullet rather than keeping both.
- Populate "missingForRole": a short list of things the target role likely wants that are NOT present anywhere in the source profile (e.g. "No cloud infrastructure experience found in source profile"). This is shown to the user so they know what to address themselves — do not fabricate the missing items into the resume to fill the gap.
- Leave "interests" and "portfolioLink" as empty strings — those are filled by the user later, not by you.
- Do not set "templateId" — it is chosen by the user separately and will be ignored if you include it.

JSON schema:
{
  "targetRole": string,
  "fullName": string,
  "headline": string,
  "contact": { "email"?: string, "phone"?: string, "location"?: string, "linkedin"?: string },
  "summary": string,
  "experience": [{ "company": string, "title": string, "startDate"?: string, "endDate"?: string, "location"?: string, "bullets": string[] }],
  "education": [...same as source...],
  "projects": [...same as source...],
  "skills": string[],
  "certifications": [...same as source...],
  "interests": "",
  "portfolioLink": "",
  "missingForRole": string[]
}`;

const SCORE_SYSTEM_PROMPT = `You score a tailored resume against its specific target role. The score must be job-specific — judged against how well this resume fits THIS target role, not resume quality in the abstract.

Rules (must follow exactly):
- Output ONLY valid JSON matching the schema below. No preamble, no markdown fences, no commentary.
- "atsCompatibility": judge structural/parsing friendliness — consistent date formats, no empty required fields, standard section content, bullet-based (not paragraph-only) experience. You're scoring the underlying data, not a rendered layout.
- "roleMatch": how well the summary, experience, and headline actually speak to the stated target role.
- "skillsMatch": overlap between the resume's skills/experience and what the target role is likely asking for.
- "missingKeywords": specific skills, tools, or terms the target role likely expects that are absent anywhere in the resume (skills list, bullets, summary, projects). Only list things genuinely absent — do not invent what "should" be there beyond what a reasonable read of the target role implies.
- "strengths": 3-5 concrete strengths, each grounded in something specific on the resume (name the company, bullet, or skill).
- "areasToImprove": 3-5 concrete, specific weaknesses — not generic advice.
- "suggestions": 3-6 specific, actionable edits that would raise the score (e.g. "Add a metric to the Northlane latency bullet", "Move Python earlier in the skills list since the role leads with it", "Tighten the summary's second sentence — it's generic"). Never suggest fabricating a skill, employer, or metric that isn't already true of this person; if something is genuinely missing, that belongs in missingKeywords/areasToImprove, not invented into a suggestion.
- Every numeric score is 0-100.

JSON schema:
{
  "overallScore": number,
  "atsCompatibility": { "score": number, "notes": string[] },
  "roleMatch": { "score": number, "notes": string[] },
  "skillsMatch": { "score": number, "notes": string[] },
  "missingKeywords": string[],
  "strengths": string[],
  "areasToImprove": string[],
  "suggestions": string[]
}`;

const IMPROVE_SYSTEM_PROMPT = `You revise a tailored resume to raise its score against its target role, using score feedback (areas to improve, missing keywords, suggestions) as your brief.

Rules (must follow exactly):
- Output ONLY valid JSON matching the SAME schema as a tailored resume (see below). No preamble, no markdown fences, no commentary.
- You may ONLY use facts already present in the resume you're given: companies, titles, dates, schools, skills, certifications, metrics. Never invent or add a new skill, tool, employer, or accomplishment that isn't already there — including to "fill" a missing keyword. If a suggested keyword isn't actually true of this person, leave it out; it should still appear in missingForRole afterward.
- You MAY: rewrite bullets to be sharper and more specific, surface existing-but-buried skills earlier, tighten the summary toward the role, reorder skills/experience by relevance, and improve ATS-friendliness (consistent date formatting, filling in any empty-but-knowable structural gaps using only existing info) — all using only what's already true in the source resume.
- Keep "interests" and "portfolioLink" exactly as given — do not clear or invent them.
- Keep "templateId" exactly as given.
- Recompute "missingForRole" to reflect what's still genuinely missing after your edits — don't remove a real gap just because you didn't fabricate something to cover it.

JSON schema:
{
  "targetRole": string,
  "templateId": string,
  "fullName": string,
  "headline": string,
  "contact": { "email"?: string, "phone"?: string, "location"?: string, "linkedin"?: string },
  "summary": string,
  "experience": [{ "company": string, "title": string, "startDate"?: string, "endDate"?: string, "location"?: string, "bullets": string[] }],
  "education": [{ "institution": string, "degree": string, "field"?: string, "startDate"?: string, "endDate"?: string, "details"?: string }],
  "projects": [{ "name": string, "description"?: string, "bullets": string[], "link"?: string }],
  "skills": string[],
  "certifications": [{ "name": string, "issuer"?: string, "date"?: string }],
  "interests": string,
  "portfolioLink": string,
  "missingForRole": string[]
}`;

const INTERVIEW_QUESTIONS_SYSTEM_PROMPT = `You predict likely interview questions based on a tailored resume and target role.
Rules:
- Output ONLY valid JSON, no commentary.
- Base every question on something actually in the resume (a bullet, a project, a gap) — never invent experience to ask about.
- Mix of: questions probing depth on a specific claim, and questions addressing anything in missingForRole.
- Keep each question short and specific, not generic ("tell me about yourself").
- 5-8 questions total.
JSON schema:
{
  "questions": [
    { "question": string, "basedOn": string, "tip": string }
  ]
}`;

export const AIService = {
  /**
   * Step 3: raw, un-tailored extraction from uploaded/pasted text.
   * Stored as-is in career_profiles.profile_json.
   */
  async extractProfile(text: string): Promise<RawProfile> {
    if (!text || text.trim().length < 20) {
      throw new Error("Source text is too short to extract a profile from.");
    }
    const raw = await callStrictJson(
      EXTRACT_SYSTEM_PROMPT,
      `Extract the structured profile from this text:\n\n${text}`
    );
    const parsed = RawProfileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `AI extraction did not match the expected schema: ${parsed.error.message}`
      );
    }
    return parsed.data;
  },

  /**
   * Step 4: tailor a stored raw profile toward a target role.
   * Does not mutate the raw profile — a new resume row is created from this.
   */
  async tailorResume(
    profile: RawProfile,
    targetRole: string,
    templateId: TailoredResume["templateId"] = "classic"
  ): Promise<TailoredResume> {
    if (!targetRole || targetRole.trim().length < 2) {
      throw new Error("A target role is required to tailor a resume.");
    }
    const raw = await callStrictJson(
      TAILOR_SYSTEM_PROMPT,
      `Target role:\n${targetRole}\n\nSource profile (JSON, factual ground truth — do not exceed it):\n${JSON.stringify(
        profile,
        null,
        2
      )}`
    );
    const parsed = TailoredResumeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `AI tailoring did not match the expected schema: ${parsed.error.message}`
      );
    }
    // templateId is a user choice made on the template step, not an AI
    // decision — set it here regardless of what (if anything) the model returned.
    return { ...parsed.data, templateId };
  },

  /**
   * Step 5: score a tailored resume specifically against its own
   * targetRole. Read-only — never mutates the resume.
   */
  async scoreResume(resume: TailoredResume): Promise<ResumeScore> {
    const raw = await callStrictJson(
      SCORE_SYSTEM_PROMPT,
      `Target role:\n${resume.targetRole}\n\nTailored resume (JSON):\n${JSON.stringify(
        resume,
        null,
        2
      )}`
    );
    const parsed = ResumeScoreSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `AI scoring did not match the expected schema: ${parsed.error.message}`
      );
    }
    return parsed.data;
  },

  /**
   * "Improve My Score": revise the resume using the score feedback as a
   * brief. Same anti-fabrication constraints as tailorResume — this can
   * only sharpen or resurface what's already true, never add new facts.
   */
  async improveResume(resume: TailoredResume, score: ResumeScore): Promise<TailoredResume> {
    const raw = await callStrictJson(
      IMPROVE_SYSTEM_PROMPT,
      `Target role:\n${resume.targetRole}\n\nCurrent resume (JSON):\n${JSON.stringify(
        resume,
        null,
        2
      )}\n\nScore feedback to address:\nAreas to improve: ${JSON.stringify(
        score.areasToImprove
      )}\nMissing keywords: ${JSON.stringify(
        score.missingKeywords
      )}\nSuggestions: ${JSON.stringify(score.suggestions)}`
    );
    const parsed = TailoredResumeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `AI improvement did not match the expected schema: ${parsed.error.message}`
      );
    }
    // Guard the fields the model was told not to touch, same pattern as
    // tailorResume guarding templateId — belt and suspenders.
    return {
      ...parsed.data,
      templateId: resume.templateId,
      interests: resume.interests,
      portfolioLink: resume.portfolioLink,
    };
  },

  /**
   * Step 7 (post-export): predict likely interview questions from the
   * finished tailored resume + target role. Purely additive — never mutates
   * the resume, no DB write of its own (the API route can choose to store
   * it if useful, but AIService just returns the questions).
   */
  async predictInterviewQuestions(resume: TailoredResume): Promise<InterviewQuestion[]> {
    const raw = await callStrictJson(
      INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
      `Target role:\n${resume.targetRole}\n\nTailored resume (JSON):\n${JSON.stringify(
        resume,
        null,
        2
      )}`
    );
    const parsed = InterviewQuestionsSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `AI interview-question prediction did not match the expected schema: ${parsed.error.message}`
      );
    }
    return parsed.data.questions;
  },
};