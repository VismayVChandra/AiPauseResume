"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, FileSearch, Wand2, Sparkles, ArrowRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PauseRunGame } from "@/components/genforge/pause-run-game";
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
  const [showGame, setShowGame] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // Don't yank someone out of a run they're in the middle of — once
    // they've actually started playing, the resume waits for them behind
    // an explicit button instead of auto-advancing.
    if (playing) return;
    // A short settle beat so the final checkmark is visible before moving
    // on — not a delay standing in for unfinished work, which has already
    // finished by the time `ready` flips true.
    const t = setTimeout(onDone, 400);
    return () => clearTimeout(t);
  }, [ready, onDone, playing]);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center py-16 text-center",
        showGame ? "max-w-2xl" : "max-w-md"
      )}
    >
      <div className={ready ? "" : "animate-pulse"}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand-muted text-brand">
          <Sparkles className="h-7 w-7" strokeWidth={1.75} />
        </span>
      </div>

      <h2 className="mt-6 font-serif text-2xl tracking-tight text-foreground">
        {ready ? "Your resume is ready" : "Tailoring your resume"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {ready
          ? "Finish your run whenever you like — it'll be waiting."
          : role
            ? `Shaping everything toward "${role.length > 60 ? role.slice(0, 60) + "…" : role}".`
            : "Structuring your profile into a resume."}
      </p>

      {/* Once the work is done and they're mid-game, this is the way out. */}
      {ready && playing && (
        <Button size="lg" onClick={onDone} className="mt-5 gap-2">
          Continue to my resume
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      <ul className="mt-8 flex w-full max-w-md flex-col gap-2 text-left">
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

      {/* Opt-in, so it never gets in the way of someone who just wants to wait. */}
      {!showGame ? (
        <button
          onClick={() => setShowGame(true)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
        >
          <Gamepad2 className="h-3.5 w-3.5" />
          Got a second? Play while you wait
        </button>
      ) : (
        <div className="mt-6 w-full">
          <PauseRunGame onFirstStart={() => setPlaying(true)} />
        </div>
      )}
    </div>
  );
}
