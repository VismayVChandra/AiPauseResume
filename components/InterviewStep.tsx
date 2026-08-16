"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkedInGlyph } from "@/components/genforge/logo";
import { cn } from "@/lib/utils";
import { InterviewQuestion, TailoredResume } from "@/types/resume";

// A small, cheerful multi-color accent set (Google-tab-style) used to give
// each question card a distinct identity in the grid.
const ACCENTS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

export function InterviewStep({
  resume,
  onNext,
  onBack,
}: {
  resume: TailoredResume;
  onNext: () => void;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't generate questions.");
      setQuestions(json.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate questions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl py-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 6 of 7</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            Interview prep
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            Likely questions for <b className="text-foreground">{resume.targetRole || "this role"}</b>,
            grounded in what&apos;s actually on your resume — plus a tip for each.
          </p>
        </div>
        {questions && (
          <button
            onClick={generateQuestions}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !questions && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin text-brand" />
          Thinking through what they&apos;ll ask…
        </div>
      )}

      {questions && (
        <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {questions.map((q, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <li
                key={i}
                className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-1.5">
                  {ACCENTS.map((c, j) => (
                    <span key={j} className="h-full flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex items-start gap-3 p-5">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {q.question}
                    </p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <LinkedInGlyph className="mt-0.5 h-3 w-3 shrink-0 text-linkedin" />
                      <span>{q.basedOn}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 border-t border-border bg-muted/40 px-5 py-3">
                  <Lightbulb
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: accent }}
                    strokeWidth={2}
                  />
                  <p className="text-xs leading-relaxed text-foreground/80">{q.tip}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to score
        </Button>
        <Button size="lg" onClick={onNext}>
          Continue to export
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
