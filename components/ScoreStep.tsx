"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Gauge,
  Target,
  Wrench,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Wand2,
  RefreshCw,
  TrendingUp,
  Plus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeywordMatchPanel } from "@/components/genforge/keyword-match-panel";
import { ScoreHistoryChart } from "@/components/genforge/score-history-chart";
import { cn } from "@/lib/utils";
import { detectTimelineGaps } from "@/lib/timeline-gaps";
import { getOrCreateSessionId, getAccessToken } from "@/lib/supabase";
import { ResumeScore, TailoredResume } from "@/types/resume";
import { CalendarClock } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-brand", ring: "var(--brand)", bg: "bg-brand-muted/50" };
  if (score >= 60) return { text: "text-amber-600", ring: "#d97706", bg: "bg-amber-50" };
  return { text: "text-destructive", ring: "var(--destructive)", bg: "bg-destructive/10" };
}

function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const { ring } = scoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl tracking-tight text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CategoryBar({
  icon: Icon,
  label,
  score,
  notes,
}: {
  icon: typeof Gauge;
  label: string;
  score: number;
  notes: string[];
}) {
  const { text, ring } = scoreColor(score);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          {label}
        </span>
        <span className={cn("font-mono text-sm font-semibold", text)}>{score}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: ring }}
        />
      </div>
      {notes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {notes.slice(0, 2).map((n, i) => (
            <li key={i} className="text-xs leading-relaxed text-muted-foreground">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Diffing — turns a before/after resume pair into a walkable list of      */
/* concrete changes, so "Improve My Score" can be watched happening        */
/* instead of just landing as a finished result.                          */
/* ---------------------------------------------------------------------- */

type Diff = { label: string; before: string; after: string };

function buildDiffs(before: TailoredResume, after: TailoredResume): Diff[] {
  const diffs: Diff[] = [];

  if (before.summary.trim() !== after.summary.trim()) {
    diffs.push({ label: "Summary", before: before.summary, after: after.summary });
  }

  const maxExp = Math.max(before.experience.length, after.experience.length);
  for (let i = 0; i < maxExp; i++) {
    const b = before.experience[i];
    const a = after.experience[i];
    if (!b || !a) continue;
    const label = `${a.title || b.title}${a.company ? " · " + a.company : ""}`;
    const maxBullets = Math.max(b.bullets.length, a.bullets.length);
    for (let j = 0; j < maxBullets; j++) {
      const bb = b.bullets[j] || "";
      const ab = a.bullets[j] || "";
      if (bb.trim() !== ab.trim() && ab.trim()) {
        diffs.push({ label: `${label} — bullet ${j + 1}`, before: bb, after: ab });
      }
    }
  }

  const beforeSkills = before.skills.join(", ");
  const afterSkills = after.skills.join(", ");
  if (beforeSkills !== afterSkills) {
    diffs.push({ label: "Skills", before: beforeSkills || "(none)", after: afterSkills });
  }

  return diffs;
}

/* ---------------------------------------------------------------------- */
/* Step-by-step reveal of the improvement — walks through each diff one   */
/* at a time instead of swapping the whole resume in an instant.          */
/* ---------------------------------------------------------------------- */

function ImprovementReveal({
  diffs,
  onFinished,
}: {
  diffs: Diff[];
  onFinished: () => void;
}) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (diffs.length === 0) {
      onFinished();
      return;
    }
    if (revealed >= diffs.length) {
      const t = setTimeout(onFinished, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, diffs.length]);

  return (
    <div className="mt-8 rounded-2xl border border-brand/25 bg-brand-muted/15 p-6">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-medium text-foreground">
          Rewriting your resume, using only what&apos;s already there…
        </h3>
      </div>

      <ol className="mt-5 flex flex-col gap-4">
        {diffs.map((d, i) => {
          const isRevealed = i < revealed;
          const isCurrent = i === revealed;
          if (!isRevealed && !isCurrent) return null;
          return (
            <li
              key={i}
              className={cn(
                "rounded-lg border bg-card p-4 transition-all duration-500",
                isCurrent ? "border-brand/40 shadow-sm" : "border-border"
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {d.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-through decoration-destructive/40">
                {d.before || "(empty)"}
              </p>
              {isRevealed ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-relaxed text-foreground">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  {d.after}
                </p>
              ) : (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Rewriting…
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {revealed >= diffs.length && (
        <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-brand">
          <Check className="h-3.5 w-3.5" />
          Done — updating your score…
        </p>
      )}
    </div>
  );
}

export function ScoreStep({
  resume,
  resumeId,
  onResumeImproved,
  onNext,
}: {
  resume: TailoredResume;
  resumeId: string | null;
  onResumeImproved: (next: TailoredResume) => void;
  onNext: () => void;
}) {
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Improvement reveal state: we fetch the improved resume up front, then
  // walk the diffs on screen before actually applying it.
  const [pendingImproved, setPendingImproved] = useState<TailoredResume | null>(null);
  const [fetchingImprovement, setFetchingImprovement] = useState(false);

  // Keywords the user has manually confirmed and added since the last score run.
  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  // Per-suggestion apply state: index of the one currently in flight, and
  // the set already applied since the last score run (indices reset on
  // rescore since a fresh score means a fresh suggestions list).
  const [applyingSuggestion, setApplyingSuggestion] = useState<number | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const dirty = addedKeywords.length > 0 || appliedSuggestions.size > 0;

  // Bumped after every successful score so ScoreHistoryChart knows to
  // refetch — simpler than threading the new entry through as a prop.
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  async function runScore(target: TailoredResume = resume) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/score-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't score this resume.");
      const nextScore = json.score as ResumeScore;
      setScore(nextScore);
      setAddedKeywords([]);
      setAppliedSuggestions(new Set());

      // Best-effort snapshot for the score-over-time chart — never blocks
      // the score itself from showing if this fails.
      if (resumeId) {
        getAccessToken()
          .then((token) =>
            fetch(`/api/resumes/${resumeId}/score-history`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-session-id": getOrCreateSessionId(),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                overallScore: nextScore.overallScore,
                atsScore: nextScore.atsCompatibility.score,
                roleMatchScore: nextScore.roleMatch.score,
                skillsMatchScore: nextScore.skillsMatch.score,
              }),
            })
          )
          .then(() => setHistoryRefreshKey((k) => k + 1))
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't score this resume.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diffs = useMemo(
    () => (pendingImproved ? buildDiffs(resume, pendingImproved) : []),
    [pendingImproved, resume]
  );

  // Deterministic — pure date math on the resume's own dates, no AI call.
  const timelineGaps = useMemo(() => detectTimelineGaps(resume.experience), [resume.experience]);

  async function handleImprove() {
    if (!score) return;
    setFetchingImprovement(true);
    setError(null);
    try {
      // Snapshot the current state before it gets rewritten, so this pass
      // is revertible from the review screen's version history if the
      // rewrite doesn't actually land better.
      if (resumeId) {
        getAccessToken().then((token) =>
          fetch(`/api/resumes/${resumeId}/versions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-session-id": getOrCreateSessionId(),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ resume, label: "Before AI improvement" }),
          })
        ).catch(() => {
          // best-effort — a failed snapshot shouldn't block the improvement itself
        });
      }

      const res = await fetch("/api/improve-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, score }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't improve this resume.");
      setPreviousScore(score.overallScore);
      setPendingImproved(json.resume as TailoredResume);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't improve this resume.");
    } finally {
      setFetchingImprovement(false);
    }
  }

  async function handleRevealFinished() {
    if (!pendingImproved) return;
    onResumeImproved(pendingImproved);
    await runScore(pendingImproved);
    setPendingImproved(null);
  }

  // User confirms a missing keyword actually applies to them — adds it
  // straight to skills. No AI call: this is the user asserting a fact, not
  // the model inventing one.
  function addMissingKeyword(keyword: string) {
    if (!score) return;
    const next = { ...resume, skills: [...resume.skills, keyword] };
    onResumeImproved(next);
    setScore({
      ...score,
      missingKeywords: score.missingKeywords.filter((k) => k !== keyword),
    });
    setAddedKeywords((prev) => [...prev, keyword]);
  }

  // Applies one specific suggestion via a scoped AI edit — narrower than
  // "Improve My Score", which rewrites against the whole feedback list at
  // once. One request in flight at a time keeps concurrent edits from
  // landing out of order against the same resume.
  async function applySuggestion(index: number) {
    if (!score || applyingSuggestion !== null || appliedSuggestions.has(index)) return;
    setApplyingSuggestion(index);
    setError(null);
    try {
      const res = await fetch("/api/apply-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, suggestion: score.suggestions[index] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't apply that suggestion.");
      onResumeImproved(json.resume as TailoredResume);
      setAppliedSuggestions((prev) => new Set(prev).add(index));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't apply that suggestion.");
    } finally {
      setApplyingSuggestion(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 5 of 7</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
        How this resume scores
      </h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        Scored specifically against <b className="text-foreground">{resume.targetRole || "your target role"}</b> —
        not a generic resume checklist.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !score && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin text-brand" />
          Scoring your resume against the role…
        </div>
      )}

      {/* the step-by-step improvement walkthrough replaces the dashboard while it plays */}
      {pendingImproved && (
        <ImprovementReveal diffs={diffs} onFinished={handleRevealFinished} />
      )}

      {score && !pendingImproved && (
        <div className="mt-8">
          {loading && (
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand" />
              Updating your score…
            </div>
          )}

          {/* headline score */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-6">
              <ScoreRing score={score.overallScore} />
              <div>
                <p className="text-sm font-medium text-foreground">Overall resume score</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Combines ATS compatibility, role match, and skills match, weighted for{" "}
                  {resume.targetRole || "this role"}.
                </p>
                {previousScore !== null && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brand">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Up from {previousScore} before improvements
                  </p>
                )}
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleImprove}
              disabled={fetchingImprovement || loading}
              className="w-full gap-2 sm:w-auto"
            >
              <Wand2 className="h-4 w-4" />
              {fetchingImprovement ? "Thinking…" : "Improve My Score"}
            </Button>
          </div>

          {dirty && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-brand/25 bg-brand-muted/25 px-4 py-2.5 text-xs text-brand">
              <span>
                {[
                  addedKeywords.length > 0
                    ? `${addedKeywords.length} skill${addedKeywords.length > 1 ? "s" : ""} added`
                    : null,
                  appliedSuggestions.size > 0
                    ? `${appliedSuggestions.size} suggestion${appliedSuggestions.size > 1 ? "s" : ""} applied`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                — rescore to see the impact.
              </span>
              <button
                onClick={() => runScore()}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 font-medium text-brand-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                Rescore
              </button>
            </div>
          )}

          <div className="mt-6">
            <ScoreHistoryChart resumeId={resumeId} refreshKey={historyRefreshKey} />
          </div>

          {/* sub-scores */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CategoryBar
              icon={Gauge}
              label="ATS Compatibility"
              score={score.atsCompatibility.score}
              notes={score.atsCompatibility.notes}
            />
            <CategoryBar
              icon={Target}
              label="Job / Role Match"
              score={score.roleMatch.score}
              notes={score.roleMatch.notes}
            />
            <CategoryBar
              icon={Wrench}
              label="Skills Match"
              score={score.skillsMatch.score}
              notes={score.skillsMatch.notes}
            />
          </div>

          {/* missing keywords — now actionable. Always shown once scored,
              same as every other panel here — an empty AI-judged gap list
              is itself a signal, not a reason to hide the section. */}
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground">Missing keywords</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Terms {resume.targetRole || "this role"} likely expects that aren&apos;t on the
              resume yet, per the AI&apos;s read of the role. If one actually applies to you, add
              it directly.
            </p>
            {score.missingKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {score.missingKeywords.map((k, i) => (
                  <button
                    key={i}
                    onClick={() => addMissingKeyword(k)}
                    className="group inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 transition-colors hover:border-brand/40 hover:bg-brand-muted/40 hover:text-brand"
                  >
                    <Plus className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
                    {k}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-brand">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No obvious gaps found for this role.
              </p>
            )}
          </div>

          {/* strengths / areas to improve */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                Strengths
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {score.strengths.map((s, i) => (
                  <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Areas to improve
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {score.areasToImprove.map((s, i) => (
                  <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* suggestions */}
          {score.suggestions.length > 0 && (
            <div className="mt-6 rounded-xl border border-brand/25 bg-brand-muted/25 p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-brand" />
                Specific suggestions to raise the score
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {score.suggestions.map((s, i) => {
                  const applied = appliedSuggestions.has(i);
                  const applying = applyingSuggestion === i;
                  return (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-xs leading-relaxed transition-colors",
                        applied ? "text-muted-foreground" : "text-foreground/85 hover:border-brand/15 hover:bg-card/60"
                      )}
                    >
                      <Lightbulb
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          applied ? "text-muted-foreground" : "text-brand"
                        )}
                      />
                      <span className={cn("flex-1", applied && "line-through decoration-muted-foreground/50")}>
                        {s}
                      </span>
                      <button
                        onClick={() => applySuggestion(i)}
                        disabled={applied || applyingSuggestion !== null}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:pointer-events-none",
                          applied
                            ? "border-transparent text-brand"
                            : "border-brand/30 bg-card text-brand hover:bg-brand-muted/40 disabled:opacity-50"
                        )}
                      >
                        {applied ? (
                          <>
                            <Check className="h-3 w-3" />
                            Applied
                          </>
                        ) : applying ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Applying…
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-3 w-3" />
                            Apply
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {timelineGaps.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <CalendarClock className="h-4 w-4" />
                Career timeline check
              </h3>
              <p className="mt-1 text-xs text-amber-800">
                A deterministic date check (not AI) — gaps of 3+ months between roles, in case
                they&apos;re worth a line in your summary or an answer ready for the interview.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {timelineGaps.map((g, i) => (
                  <li key={i} className="text-xs leading-relaxed text-amber-900">
                    <b>{g.months}-month gap</b> between {g.beforeLabel} and {g.afterLabel}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <KeywordMatchPanel resume={resume} onAddSkill={addMissingKeyword} />
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-end">
        <Button size="lg" onClick={onNext} disabled={!score || !!pendingImproved}>
          Continue to interview prep
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
