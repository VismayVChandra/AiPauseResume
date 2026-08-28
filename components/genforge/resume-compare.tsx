"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Trophy, Minus } from "lucide-react";
import { getOrCreateSessionId, getAccessToken } from "@/lib/supabase";
import type { TailoredResume, ScoreHistoryEntry } from "@/types/resume";
import { cn } from "@/lib/utils";

async function resumeAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "x-session-id": getOrCreateSessionId() };
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// A side is either a live saved resume (fetched fresh, with its latest
// score) or an already-in-memory version snapshot (version_history keeps
// no score of its own — snapshots were never independently scored, only
// the live resume is).
export type CompareSpec =
  | { kind: "live"; resumeId: string }
  | { kind: "version"; resume: TailoredResume; label: string; createdAt: string };

interface Side {
  resume: TailoredResume;
  latestScore: ScoreHistoryEntry | null;
  subtitle: string;
}

// Not a text diff — the share page renders resumes as PDFs, and word-level
// diffing two arbitrary resumes is a lot of machinery for what this
// actually needs to answer: "is this variant doing better, and where does
// it have more/less than the other one." Stats + latest score cover that
// without a diff engine.
function stats(resume: TailoredResume) {
  const bulletCount =
    resume.experience.reduce((sum, e) => sum + e.bullets.length, 0) +
    resume.projects.reduce((sum, p) => sum + p.bullets.length, 0);
  return {
    experienceEntries: resume.experience.length,
    bulletCount,
    skillsCount: resume.skills.length,
    summaryWords: resume.summary.trim() ? resume.summary.trim().split(/\s+/).length : 0,
    projectsCount: resume.projects.length,
  };
}

function Row({
  label,
  a,
  b,
  higherIsBetter = true,
}: {
  label: string;
  a: number | null;
  b: number | null;
  higherIsBetter?: boolean;
}) {
  const aWins = a !== null && b !== null && a !== b && (higherIsBetter ? a > b : a < b);
  const bWins = a !== null && b !== null && a !== b && (higherIsBetter ? b > a : b < a);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <span className={cn("text-right text-sm tabular-nums", aWins ? "font-semibold text-brand" : "text-foreground")}>
        {a === null ? "—" : a}
      </span>
      <span className="min-w-[7rem] text-center text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-left text-sm tabular-nums", bWins ? "font-semibold text-brand" : "text-foreground")}>
        {b === null ? "—" : b}
      </span>
    </div>
  );
}

export function ResumeCompare({
  sideA,
  sideB,
  onClose,
}: {
  sideA: CompareSpec;
  sideB: CompareSpec;
  onClose: () => void;
}) {
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSide(spec: CompareSpec): Promise<Side> {
      if (spec.kind === "version") {
        return {
          resume: spec.resume,
          latestScore: null,
          subtitle: `${spec.label} · ${new Date(spec.createdAt).toLocaleDateString()}`,
        };
      }
      const headers = await resumeAuthHeaders();
      const [resumeRes, scoreRes] = await Promise.all([
        fetch(`/api/resumes/${spec.resumeId}`, { headers }),
        fetch(`/api/resumes/${spec.resumeId}/score-history`, { headers }),
      ]);
      const resumeJson = await resumeRes.json();
      if (!resumeRes.ok) throw new Error(resumeJson.error || "Couldn't load one of the resumes.");
      const scoreJson = await scoreRes.json();
      const entries: ScoreHistoryEntry[] = scoreRes.ok ? scoreJson.entries || [] : [];
      return {
        resume: resumeJson.resume,
        latestScore: entries.length ? entries[entries.length - 1] : null,
        subtitle: resumeJson.resume.fullName,
      };
    }
    (async () => {
      try {
        const [loadedA, loadedB] = await Promise.all([loadSide(sideA), loadSide(sideB)]);
        if (cancelled) return;
        setA(loadedA);
        setB(loadedB);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load these resumes.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sideA, sideB]);

  const loading = !a || !b;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl text-foreground">Compare</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="mt-10 flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            Loading both resumes…
          </div>
        )}

        {a && b && (
          <div className="mt-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{a.resume.targetRole || "Untitled role"}</p>
                <p className="text-xs text-muted-foreground">{a.subtitle}</p>
              </div>
              <span className="pt-0.5 text-[11px] text-muted-foreground">vs</span>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{b.resume.targetRole || "Untitled role"}</p>
                <p className="text-xs text-muted-foreground">{b.subtitle}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
              <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Latest score</span>
            </div>
            <Row label="Overall" a={a.latestScore?.overallScore ?? null} b={b.latestScore?.overallScore ?? null} />
            <Row label="ATS" a={a.latestScore?.atsScore ?? null} b={b.latestScore?.atsScore ?? null} />
            <Row label="Role match" a={a.latestScore?.roleMatchScore ?? null} b={b.latestScore?.roleMatchScore ?? null} />
            <Row label="Skills match" a={a.latestScore?.skillsMatchScore ?? null} b={b.latestScore?.skillsMatchScore ?? null} />
            {!a.latestScore && !b.latestScore && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Minus className="h-3 w-3" />
                {sideA.kind === "version" || sideB.kind === "version"
                  ? "No score to compare — version snapshots aren't scored on their own."
                  : "Neither has been scored yet."}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
              <span className="text-xs font-medium text-muted-foreground">Content</span>
            </div>
            <Row label="Experience entries" a={stats(a.resume).experienceEntries} b={stats(b.resume).experienceEntries} />
            <Row label="Bullets" a={stats(a.resume).bulletCount} b={stats(b.resume).bulletCount} />
            <Row label="Skills listed" a={stats(a.resume).skillsCount} b={stats(b.resume).skillsCount} />
            <Row label="Projects" a={stats(a.resume).projectsCount} b={stats(b.resume).projectsCount} />
            <Row label="Summary words" a={stats(a.resume).summaryWords} b={stats(b.resume).summaryWords} />
          </div>
        )}
      </div>
    </div>
  );
}
