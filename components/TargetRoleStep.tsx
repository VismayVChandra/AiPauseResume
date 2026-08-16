"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Frontend Engineer Intern",
  "Product Design Intern",
  "Data Analyst — new grad",
  "Software Engineer I",
];

export function TargetRoleStep({ onNext }: { onNext: (targetRole: string) => void }) {
  const [value, setValue] = useState("");
  const canContinue = value.trim().length > 2;

  return (
    <div className="mx-auto max-w-2xl py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 2 of 5</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
        What job are you aiming for?
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Paste a title, a full job description, or a few lines about the role. The more you share,
        the more precisely we can tailor your resume.
      </p>

      <div className="mt-8">
        <label htmlFor="target-role" className="sr-only">
          Target role or job description
        </label>
        <textarea
          id="target-role"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          rows={6}
          placeholder="e.g. Frontend Engineer Intern at a design-led startup. React + TypeScript, cares about accessibility and performance…"
          className="w-full resize-none rounded-xl border border-border bg-card p-5 font-sans text-lg leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Or start from:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setValue(s)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <Button size="lg" disabled={!canContinue} onClick={() => onNext(value.trim())}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
