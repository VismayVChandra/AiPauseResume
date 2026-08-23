"use client";

import { useState } from "react";
import { ListChecks, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeKeywordMatch } from "@/lib/keyword-match";
import { TailoredResume } from "@/types/resume";

// Deterministic (no AI call) literal keyword overlap between the resume and
// a pasted job description — a reproducible number to sit alongside the
// AI's judgment-call score, not a replacement for it.
export function KeywordMatchPanel({
  resume,
  onAddSkill,
}: {
  resume: TailoredResume;
  onAddSkill: (skill: string) => void;
}) {
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<ReturnType<typeof computeKeywordMatch> | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  function run() {
    if (jd.trim().length < 30) return;
    setResult(computeKeywordMatch(resume, jd));
    setAdded([]);
  }

  function add(keyword: string) {
    onAddSkill(keyword);
    setAdded((prev) => [...prev, keyword]);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ListChecks className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        Exact keyword match against a job description
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Paste the full job posting for a literal, reproducible term-overlap check — separate from
        the AI score above, which judges fit rather than exact wording.
      </p>

      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={5}
        placeholder="Paste the full job description here…"
        className="mt-3 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
      />

      <Button
        size="sm"
        variant="outline"
        onClick={run}
        disabled={jd.trim().length < 30}
        className="mt-2"
      >
        Check coverage
      </Button>

      {result && (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                style={{ width: `${result.coveragePct}%` }}
              />
            </div>
            <span className="font-mono text-xs font-semibold text-foreground">
              {result.coveragePct}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {result.covered.length} of {result.covered.length + result.missing.length} terms
            found on the resume, verbatim.
          </p>

          {result.missing.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-foreground">Missing from the resume</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.missing.map((k, i) =>
                  added.includes(k) ? (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-muted bg-brand-muted/40 px-2.5 py-1 text-xs text-brand"
                    >
                      <Check className="h-3 w-3" />
                      {k}
                    </span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => add(k)}
                      className="group inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 transition-colors hover:border-brand/40 hover:bg-brand-muted/40 hover:text-brand"
                    >
                      <Plus className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
                      {k}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {result.covered.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-foreground">Already covered</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.covered.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
