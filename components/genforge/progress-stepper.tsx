"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = [
  { n: 1, key: "template", label: "Template" },
  { n: 2, key: "role", label: "Target role" },
  { n: 3, key: "import", label: "Import profile" },
  { n: 4, key: "review", label: "Review & edit" },
  { n: 5, key: "score", label: "Score" },
  { n: 6, key: "interview", label: "Interview prep" },
  { n: 7, key: "export", label: "Export" },
] as const;

export function ProgressStepper({ current }: { current: number }) {
  const fraction = (current - 1) / (STEPS.length - 1);

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="relative flex items-start justify-between">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-[15px] mx-[15px] h-px bg-border"
        />
        <div
          aria-hidden="true"
          className="absolute left-0 top-[15px] mx-[15px] h-px bg-brand transition-[width] duration-700 ease-out"
          style={{ width: `calc((100% - 30px) * ${fraction})` }}
        />

        {STEPS.map((step) => {
          const isDone = step.n < current;
          const isCurrent = step.n === current;
          return (
            <li
              key={step.key}
              className="relative flex flex-col items-center gap-2"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors duration-300 bg-background",
                  isDone && "border-brand bg-brand text-brand-foreground",
                  isCurrent && "border-brand bg-background text-brand ring-2 ring-brand/20",
                  !isDone && !isCurrent && "border-border text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <span className="font-mono">{step.n}</span>
                )}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium transition-colors sm:block",
                  isCurrent ? "text-foreground" : isDone ? "text-brand" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
