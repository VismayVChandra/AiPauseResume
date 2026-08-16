"use client";

import { ArrowRight, Sparkles, FileText, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PauseResumeMark, LinkedInGlyph } from "@/components/genforge/logo";

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-0">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Pause. Refine. Resume.
        </span>

        <h1 className="mt-6 font-serif text-5xl leading-[1.03] tracking-tight text-foreground sm:text-6xl">
          Hit pause on the resume that&apos;s{" "}
          <span className="text-brand">holding you back.</span>
        </h1>

        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
          Import your LinkedIn PDF or an existing resume, tell us the job you actually want, and
          watch it get refined — scored, sharpened, and rebuilt around that role — before you
          resume the search with something that actually fits.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={onStart} size="lg">
            Pause my resume
            <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Free · no account needed</span>
        </div>

        <ul className="mt-10 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
          <li className="flex items-center gap-2">
            <LinkedInGlyph className="h-4 w-4 text-linkedin" />
            LinkedIn or resume — one upload
          </li>
          <li className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-brand" strokeWidth={2} />
            Scored for the role
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" strokeWidth={2} />
            Refined, not reinvented
          </li>
          <li className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-foreground" strokeWidth={2} />
            PDF &amp; DOCX
          </li>
        </ul>

        <div className="mt-10 flex items-center gap-5 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-muted text-[9px] font-bold text-brand">
              1
            </span>
            Pause
          </span>
          <span className="h-px w-6 bg-border" aria-hidden />
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-muted text-[9px] font-bold text-brand">
              2
            </span>
            Refine
          </span>
          <span className="h-px w-6 bg-border" aria-hidden />
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-muted text-[9px] font-bold text-brand">
              3
            </span>
            Resume
          </span>
        </div>
      </div>

      <div>
        <DocumentHero />
      </div>
    </div>
  );
}

function DocumentHero() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-x-4 -bottom-3 top-4 rounded-lg bg-paper-edge/40 blur-sm" />
      <div className="absolute inset-x-2 -bottom-1.5 top-2 rounded-lg border border-border bg-card" />

      <div className="relative overflow-hidden rounded-lg border border-border bg-paper p-7 shadow-[0_20px_50px_-20px_oklch(0.24_0.012_255/0.25)]">
        <PauseResumeMark className="absolute right-5 top-5 h-6 w-6 opacity-80" />

        <div>
          <div className="font-serif text-xl text-foreground">Maya Okonkwo</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Frontend Engineer · Seattle, WA
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-brand/20 bg-brand-muted/40 px-2.5 py-1.5">
          <Gauge className="h-3.5 w-3.5 text-brand" />
          <span className="text-[11px] font-medium text-brand">Resume score: 87 / 100</span>
        </div>

        <SheetSection label="Experience" lines={[90, 70]} tone="ink" />
        <SheetSection label="Skills" lines={[60]} tone="brand" />
        <SheetSection label="Education" lines={[80]} tone="ink" />
      </div>
    </div>
  );
}

function SheetSection({
  label,
  lines,
  tone,
}: {
  label: string;
  lines: number[];
  tone: "ink" | "brand";
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${tone === "brand" ? "bg-brand" : "bg-foreground/70"}`}
        />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pl-3.5">
        {lines.map((w, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full ${tone === "brand" ? "bg-brand/25" : "bg-foreground/12"}`}
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}
