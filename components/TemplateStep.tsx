"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEMPLATE_OPTIONS, TemplateId } from "@/types/resume";
import { cn } from "@/lib/utils";
import { useState } from "react";

function TemplatePreview({ id }: { id: TemplateId }) {
  if (id === "modern") {
    return (
      <svg viewBox="0 0 120 150" className="h-32 w-full rounded-md">
        <rect width="120" height="150" fill="var(--paper)" />
        <rect width="42" height="150" fill="oklch(0.24 0.012 255)" />
        <rect x="8" y="12" width="26" height="4" fill="oklch(0.8 0.06 168)" />
        <rect x="8" y="24" width="26" height="2" fill="oklch(0.55 0.01 255)" />
        <rect x="8" y="40" width="26" height="2" fill="oklch(0.55 0.01 255)" />
        <rect x="8" y="60" width="26" height="2" fill="oklch(0.55 0.01 255)" />
        <rect x="52" y="14" width="30" height="4" fill="var(--brand)" />
        <rect x="52" y="24" width="58" height="2" fill="var(--border)" />
        <rect x="52" y="29" width="58" height="2" fill="var(--border)" />
        <rect x="52" y="48" width="30" height="4" fill="var(--brand)" />
        <rect x="52" y="58" width="58" height="2" fill="var(--muted)" />
      </svg>
    );
  }
  if (id === "minimal") {
    return (
      <svg viewBox="0 0 120 150" className="h-32 w-full rounded-md">
        <rect width="120" height="150" fill="var(--paper)" stroke="var(--border)" />
        <rect x="16" y="16" width="50" height="6" fill="var(--foreground)" />
        <rect x="16" y="26" width="40" height="2" fill="var(--muted-foreground)" />
        <rect x="16" y="42" width="20" height="2" fill="var(--muted-foreground)" />
        <rect x="16" y="50" width="88" height="2" fill="var(--border)" />
        <rect x="16" y="72" width="20" height="2" fill="var(--muted-foreground)" />
        <rect x="16" y="80" width="88" height="2" fill="var(--border)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" className="h-32 w-full rounded-md">
      <rect width="120" height="150" fill="var(--paper)" stroke="var(--border)" />
      <rect x="12" y="12" width="50" height="6" fill="var(--foreground)" />
      <rect x="12" y="24" width="35" height="2" fill="var(--muted-foreground)" />
      <rect x="12" y="36" width="96" height="1" fill="var(--border)" />
      <rect x="12" y="42" width="30" height="2" fill="var(--foreground)" />
      <rect x="12" y="48" width="96" height="2" fill="var(--muted)" />
      <rect x="12" y="66" width="96" height="1" fill="var(--border)" />
      <rect x="12" y="72" width="30" height="2" fill="var(--foreground)" />
      <rect x="12" y="78" width="80" height="2" fill="var(--muted)" />
    </svg>
  );
}

export function TemplateStep({ onNext }: { onNext: (templateId: TemplateId) => void }) {
  const [selected, setSelected] = useState<TemplateId | null>(null);

  return (
    <div className="mx-auto max-w-3xl py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 1 of 5</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
        Choose a resume template
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        You can switch this later, right up until you export — it just picks your starting layout.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TEMPLATE_OPTIONS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              "text-left rounded-xl border bg-card p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              selected === t.id
                ? "border-brand ring-2 ring-brand/20"
                : "border-border hover:border-brand/40"
            )}
          >
            <TemplatePreview id={t.id} />
            <div className="mt-2 text-sm font-medium text-foreground">{t.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
          </button>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <Button size="lg" disabled={!selected} onClick={() => selected && onNext(selected)}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
