"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGame,
  stepGame,
  commitDrop,
  type StackGameData,
  W,
  H,
} from "@/lib/stack-resume-game";

// Third game, third relationship to Pause: no reflexes or steering here,
// just a block sweeping back and forth. Pause freezes the sweep so you can
// evaluate the current alignment with zero time pressure; Resume lets it
// keep sweeping toward a better spot; dropping (tap/Space) works whether
// paused or running, since committing IS the point of having paused to
// aim in the first place. Simulation lives in lib/stack-resume-game.ts —
// tested headlessly, same reasoning as the other two games (rAF doesn't
// run in a hidden tab).

type GameState = "idle" | "running" | "paused" | "over";

const HIGH_SCORE_KEY = "pauseresume_stack_best";
const SWEEP_Y = 26;
const BLOCK_H = 13;

export function StackResumeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<StackGameData>(createGame());
  const stateRef = useRef<GameState>("idle");
  const rafRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const paletteRef = useRef({
    ink: "#1f2937",
    brand: "#0f766e",
    muted: "#9ca3af",
    paper: "#ffffff",
    line: "#d1d5db",
  });

  const [state, setState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  function setGameState(next: GameState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
      if (Number.isFinite(stored)) setBest(stored);
    } catch {
      // storage blocked — no memory of a best score, not fatal
    }
    const css = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    paletteRef.current = {
      ink: read("--foreground", "#1f2937"),
      brand: read("--brand", "#0f766e"),
      muted: read("--muted-foreground", "#9ca3af"),
      paper: read("--paper", "#ffffff"),
      line: read("--border", "#d1d5db"),
    };
  }, []);

  const commitBest = useCallback((value: number) => {
    setBest((prev) => {
      if (value <= prev) return prev;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(value));
      } catch {
        // non-fatal
      }
      return value;
    });
  }, []);

  const start = useCallback(() => {
    dataRef.current = createGame();
    setScore(0);
    setGameState("running");
  }, []);

  const drop = useCallback(() => {
    const s = stateRef.current;
    if (s === "idle" || s === "over") {
      start();
      return;
    }
    if (s !== "running" && s !== "paused") return;
    const d = dataRef.current;
    const ok = commitDrop(d);
    setScore(d.score);
    if (!ok) {
      commitBest(d.score);
      setGameState("over");
    }
  }, [start, commitBest]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    function blockColor(index: number): string {
      const p = paletteRef.current;
      return index % 2 === 0 ? p.brand : p.ink;
    }

    function drawBlock(x: number, y: number, w: number, color: string, label?: string) {
      const p = paletteRef.current;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, BLOCK_H - 2, 2);
      ctx.fill();
      if (label && w > 44) {
        ctx.fillStyle = p.paper;
        ctx.font = "8px ui-sans-serif, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + 5, y + (BLOCK_H - 2) / 2 + 0.5, w - 10);
      }
    }

    function render() {
      const d = dataRef.current;
      const p = paletteRef.current;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      const topIndex = d.blocks.length - 1;
      for (let i = 0; i <= topIndex; i++) {
        const b = d.blocks[i];
        const y = SWEEP_Y + BLOCK_H * (topIndex - i);
        if (y > H) continue;
        drawBlock(b.x, y, b.w, blockColor(i), b.label);
      }

      if (!d.dead) {
        drawBlock(d.current.x, SWEEP_Y - BLOCK_H, d.current.w, p.brand);
        // a faint guide showing the target below
        const top = d.blocks[d.blocks.length - 1];
        ctx.strokeStyle = p.muted;
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(top.x + 0.5, SWEEP_Y - BLOCK_H + 0.5, top.w - 1, BLOCK_H - 3);
        ctx.setLineDash([]);
      }
    }

    function frame() {
      const d = dataRef.current;
      stepGame(d, stateRef.current === "running");
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!hoveredRef.current) return;
      if (e.code !== "Space" && e.code !== "ArrowDown") return;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      drop();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drop]);

  const canPause = state === "running";
  const canResume = state === "paused";

  return (
    <div
      className="w-full rounded-xl border border-border bg-card p-3"
      onPointerEnter={() => (hoveredRef.current = true)}
      onPointerLeave={() => (hoveredRef.current = false)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {state === "over"
            ? "Missed the stack entirely."
            : state === "paused"
              ? "Frozen — check the alignment, then drop."
              : state === "running"
                ? "Drop it on the block below."
                : "Pause to freeze the sweep and aim; drop whenever you're ready."}
        </p>
        <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
          <span className="text-foreground">{String(score).padStart(4, "0")}</span>
          {best > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="h-3 w-3" />
              {String(best).padStart(4, "0")}
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-background">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.preventDefault();
            drop();
          }}
          style={{ aspectRatio: `${W} / ${H}` }}
          className="w-full cursor-pointer touch-none select-none"
          aria-label="Stack the resume — tap or press Space to drop, Pause to freeze the sweep"
          role="img"
        />

        {state !== "running" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-medium text-background">
              {state === "idle"
                ? "Tap or Space to start"
                : state === "paused"
                  ? "Paused"
                  : `Score ${score} — tap to try again`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => setGameState("paused")}
          disabled={!canPause}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Pause className="h-3 w-3" />
          Pause
        </button>
        <button
          onClick={() => setGameState("running")}
          disabled={!canResume}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40",
            canResume
              ? "border-brand/40 bg-brand-muted/50 text-brand hover:bg-brand-muted"
              : "border-border text-foreground hover:bg-muted"
          )}
        >
          <Play className="h-3 w-3" />
          Resume
        </button>
        <button
          onClick={start}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Restart
        </button>
      </div>
    </div>
  );
}
