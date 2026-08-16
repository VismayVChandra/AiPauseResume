"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Briefcase, GraduationCap, Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TASKS = [
  { key: "read", label: "Reading your profile", Icon: Sparkles },
  { key: "exp", label: "Finding your experience", Icon: Briefcase },
  { key: "edu", label: "Pulling in education", Icon: GraduationCap },
  { key: "skills", label: "Matching skills to the role", Icon: Wrench },
];

// `ready` reflects the real extract+tailor API calls actually finishing —
// the step animation is cosmetic pacing, but onDone never fires before the
// real work is done, and never lingers long after it either.
export function ExtractionLoading({
  role,
  ready,
  onDone,
}: {
  role: string;
  ready: boolean;
  onDone: () => void;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= TASKS.length) {
      if (ready) {
        const t = setTimeout(onDone, 400);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => setActive((a) => a + 1), 700);
    return () => clearTimeout(t);
  }, [active, ready, onDone]);

  // If the real work finishes before the cosmetic animation catches up,
  // fast-forward the remaining steps instead of leaving them looking stuck.
  useEffect(() => {
    if (ready && active < TASKS.length) {
      const t = setTimeout(() => setActive(TASKS.length), 300);
      return () => clearTimeout(t);
    }
  }, [ready, active]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center py-16 text-center">
      <div className="animate-pulse">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand-muted text-brand">
          <Sparkles className="h-7 w-7" strokeWidth={1.75} />
        </span>
      </div>

      <h2 className="mt-6 font-serif text-2xl tracking-tight text-foreground">
        Tailoring your resume
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {role
          ? `Shaping everything toward "${role.length > 60 ? role.slice(0, 60) + "…" : role}".`
          : "Structuring your profile into a resume."}
      </p>

      <ul className="mt-8 flex w-full flex-col gap-2 text-left">
        {TASKS.map((task, i) => {
          const done = i < active;
          const running = i === active;
          const upcoming = i > active;
          return (
            <li
              key={task.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300",
                done && "border-brand/20 bg-brand-muted/30",
                running && "border-border bg-card shadow-sm",
                upcoming && "border-transparent opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  done && "bg-brand text-brand-foreground",
                  running && "bg-muted text-foreground",
                  upcoming && "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <task.Icon className="h-4 w-4" strokeWidth={1.75} />
                )}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  done || running ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {task.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
