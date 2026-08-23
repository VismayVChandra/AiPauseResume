import { TailoredResume } from "@/types/resume";

// Deterministic, non-AI keyword coverage between a resume and a pasted job
// description. This is a literal text-overlap check, not a model's
// judgment call — it exists precisely because the AI score is a judgment
// call and users deserve one number that's reproducible and inspectable.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "so", "of", "to", "in",
  "on", "at", "for", "with", "as", "by", "from", "is", "are", "was", "were",
  "be", "been", "being", "this", "that", "these", "those", "it", "its",
  "you", "your", "we", "our", "they", "their", "will", "would", "should",
  "can", "could", "may", "might", "must", "shall", "not", "no", "yes",
  "have", "has", "had", "do", "does", "did", "than", "into", "about",
  "who", "what", "when", "where", "why", "how", "all", "each", "any",
  "other", "such", "only", "own", "same", "up", "out", "over", "under",
  "again", "further", "once", "here", "there", "both", "more", "most",
  "some", "just", "also", "etc", "eg", "ie", "per",
  // resume/JD filler that shows up constantly but isn't a real skill signal
  "role", "job", "position", "candidate", "candidates", "applicant",
  "experience", "experienced", "years", "year", "work", "working", "works",
  "strong", "excellent", "good", "great", "ability", "abilities", "skills",
  "skill", "knowledge", "understanding", "requirements", "required",
  "preferred", "responsibilities", "responsible", "including", "include",
  "team", "teams", "company", "opportunity", "environment", "looking",
  "join", "help", "helping", "across", "within", "using", "use", "used",
  "new", "plus", "must-have", "nice-to-have", "hiring", "familiarity",
]);

const WORD_PATTERN = /[A-Za-z][A-Za-z0-9+#.]*/g;

function normalize(term: string): string {
  return term.trim().toLowerCase();
}

function isStopword(term: string): boolean {
  return STOPWORDS.has(normalize(term)) || term.length < 2;
}

// Splits a job description into clause-level segments (cutting at commas,
// periods, parens, etc. so a phrase never spans two unrelated clauses), then
// within each segment groups consecutive non-stopword words into "runs" —
// e.g. "We are hiring a Frontend Engineer Intern" breaks at the stopwords
// and yields the run ["Frontend", "Engineer", "Intern"], never a phrase like
// "a Frontend Engineer" that glues a stopword onto real words.
function tokenizeRuns(text: string): string[][] {
  const segments = text.split(/[,.;:()[\]{}!?"'\n\r]+/);
  const runs: string[][] = [];
  for (const segment of segments) {
    const words = segment.match(WORD_PATTERN) || [];
    let run: string[] = [];
    for (const w of words) {
      if (isStopword(w)) {
        if (run.length) runs.push(run);
        run = [];
      } else {
        run.push(w);
      }
    }
    if (run.length) runs.push(run);
  }
  return runs;
}

/**
 * Pulls candidate keywords/phrases out of a pasted job description: single
 * significant words plus adjacent-word bigrams (e.g. "Frontend Engineer",
 * "REST API"), ranked by frequency, stopwords and resume filler removed.
 */
export function extractKeywords(jobDescription: string, limit = 30): string[] {
  const runs = tokenizeRuns(jobDescription || "");
  const counts = new Map<string, { display: string; count: number }>();

  const bump = (raw: string) => {
    const norm = normalize(raw);
    const existing = counts.get(norm);
    if (existing) existing.count += 1;
    else counts.set(norm, { display: raw, count: 1 });
  };

  for (const run of runs) {
    for (const w of run) bump(w);
    for (let i = 0; i < run.length - 1; i++) bump(`${run[i]} ${run[i + 1]}`);
  }

  // Drop single words that are already covered by a captured bigram, so
  // "React" and "React Native" don't both show up as separate entries.
  const phraseNorms = new Set([...counts.keys()].filter((k) => k.includes(" ")));
  const filtered = [...counts.entries()].filter(([norm]) => {
    if (norm.includes(" ")) return true;
    for (const p of phraseNorms) {
      if (p.split(" ").includes(norm)) return false;
    }
    return true;
  });

  return filtered
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([, v]) => v.display);
}

function resumeHaystack(resume: TailoredResume): string {
  const parts = [
    resume.headline,
    resume.summary,
    resume.skills.join(" "),
    ...resume.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...resume.projects.flatMap((p) => [p.name, p.description || "", ...p.bullets]),
    ...resume.certifications.map((c) => c.name),
    ...resume.education.map((e) => `${e.degree || ""} ${e.field || ""}`),
  ];
  return parts.join(" \n ").toLowerCase();
}

function containsTerm(haystack: string, term: string): boolean {
  const norm = normalize(term);
  const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = norm.includes(" ") || norm.includes("/")
    ? new RegExp(escaped.replace(/\s+/g, "[\\s-]+"))
    : new RegExp(`\\b${escaped}\\b`);
  return pattern.test(haystack);
}

/**
 * Compares a tailored resume against a pasted job description and returns
 * which candidate keywords from the JD are actually present in the resume
 * text (skills, bullets, summary, projects) versus missing entirely.
 */
export function computeKeywordMatch(
  resume: TailoredResume,
  jobDescription: string
): { coveragePct: number; covered: string[]; missing: string[] } {
  const keywords = extractKeywords(jobDescription);
  const haystack = resumeHaystack(resume);

  const covered: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (containsTerm(haystack, kw)) covered.push(kw);
    else missing.push(kw);
  }

  const coveragePct = keywords.length
    ? Math.round((covered.length / keywords.length) * 100)
    : 0;

  return { coveragePct, covered, missing };
}
