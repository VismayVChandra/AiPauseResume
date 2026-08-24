"use client";

import { useEffect } from "react";
import { Check, Loader2, FileSearch, Wand2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TASKS = [
  { key: "reading", label: "Reading your profile", Icon: FileSearch },
  { key: "tailoring", label: "Tailoring for the role", Icon: Wand2 },
] as const;

// Two phases, matching the two real network calls this pipeline actually
// makes (reading = extract/manual-profile, tailoring = tailor-resume) — the
// active/done state below reflects which request is actually in flight,
// not a fixed timer standing in for progress we can't really observe.
export function ExtractionLoading({
  role,
  phase,
  ready,
  onDone,
}: {
  role: string;
  phase: "reading" | "tailoring";
  ready: boolean;
  onDone: () => void;
}) {
  const activeIndex = phase === "reading" ? 0 : 1;

  useEffect(() => {
    if (!ready) return;
    // A short settle beat so the final checkmark is visible before moving
    // on — not a delay standing in for unfinished work, which has already
    // finished by the time `ready` flips true.
    const t = setTimeout(onDone, 400);
    return () => clearTimeout(t);
  }, [ready, onDone]);

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
          const done = ready || i < activeIndex;
          const running = !done && i === activeIndex;
          const upcoming = !done && !running;
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
