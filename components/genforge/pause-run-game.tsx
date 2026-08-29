"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGame,
  stepGame,
  tryJump,
  displayScore,
  type GameData,
  type Obstacle,
  W,
  H,
  GROUND_Y,
  PLAYER_X,
  PLAYER_W,
  PLAYER_H,
} from "@/lib/runner-game";
import { useGamePalette } from "@/lib/use-game-palette";

// A tiny endless-runner to play while the AI is working — the controls are
// Pause and Resume on purpose, since that's the whole product name. The
// player is a little resume sheet hopping over the things that get in the
// way of a job hunt.
//
// All the simulation lives in lib/runner-game.ts so it can be tested
// headlessly (`npm test`) — requestAnimationFrame never fires in a hidden
// tab, so the loop below can't be exercised by an automated browser check.
// This component only owns rendering and controls.

type GameState = "idle" | "running" | "paused" | "over";

const HIGH_SCORE_KEY = "pauseresume_game_best";

export function PauseRunGame({ onFirstStart }: { onFirstStart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<GameData>(createGame());
  const stateRef = useRef<GameState>("idle");
  const rafRef = useRef<number | null>(null);
  const paletteRef = useGamePalette();

  const [state, setState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const startedOnceRef = useRef(false);
  // Scoped to hover so this game and any other keyboard-driven game
  // stacked on the same page (see FreezeDodgeGame) don't both react to the
  // same key press.
  const hoveredRef = useRef(false);

  // Keep the ref in lockstep with React state so the rAF loop (which never
  // re-creates) always reads the current phase.
  function setGameState(next: GameState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
      if (Number.isFinite(stored)) setBest(stored);
    } catch {
      // storage blocked — the game just won't remember a best score
    }
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

  const jump = useCallback(() => {
    const d = dataRef.current;
    const s = stateRef.current;
    if (s === "running") {
      tryJump(d);
      return;
    }
    if (s === "idle" || s === "over") {
      dataRef.current = createGame();
      setScore(0);
      setGameState("running");
      if (!startedOnceRef.current) {
        startedOnceRef.current = true;
        onFirstStart?.();
      }
    }
  }, [onFirstStart]);

  // The draw+step loop. Set up once; it reads phase from stateRef each frame
  // so pausing doesn't tear it down and lose the run.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Bound to a const so the nested draw functions below keep the
    // non-null narrowing (TS drops it across function boundaries).
    const ctx = context;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    function drawPlayer(d: GameData) {
      const p = paletteRef.current;
      const x = PLAYER_X;
      const y = d.y;
      // the "resume sheet"
      ctx.fillStyle = p.paper;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, PLAYER_W, PLAYER_H, 3);
      ctx.fill();
      ctx.stroke();
      // text lines on the sheet
      ctx.fillStyle = p.brand;
      ctx.fillRect(x + 4, y + 5, 9, 2.5);
      ctx.fillStyle = p.line;
      ctx.fillRect(x + 4, y + 11, 12, 1.8);
      ctx.fillRect(x + 4, y + 15, 12, 1.8);
      ctx.fillRect(x + 4, y + 19, 8, 1.8);
    }

    function drawObstacle(o: Obstacle) {
      const p = paletteRef.current;
      ctx.fillStyle = p.ink;
      ctx.beginPath();
      ctx.roundRect(o.x, GROUND_Y - o.h, o.w, o.h, 2);
      ctx.fill();
    }

    function render() {
      const d = dataRef.current;
      const p = paletteRef.current;
      ctx.clearRect(0, 0, W, H);

      // ground
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 1);
      ctx.lineTo(W, GROUND_Y + 1);
      ctx.stroke();

      // dashes on the ground for a sense of speed
      ctx.fillStyle = p.line;
      for (let i = 0; i < 14; i++) {
        const x = ((i * 60 - d.groundOffset) % (W + 60) + W + 60) % (W + 60);
        ctx.fillRect(x, GROUND_Y + 7, 18, 1.5);
      }

      d.obstacles.forEach(drawObstacle);
      drawPlayer(d);
    }

    function step() {
      const d = dataRef.current;
      stepGame(d);

      const shown = displayScore(d);
      if (d.dead) {
        setScore(shown);
        commitBest(shown);
        setGameState("over");
        return;
      }
      if (d.ticks % 3 === 0) setScore(shown);
    }

    function frame() {
      if (stateRef.current === "running") step();
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [commitBest]);

  // Space / ArrowUp to jump — scoped to hover, not just "this game is on
  // screen", since another keyboard-driven game can be stacked below it on
  // the same page and would otherwise also react to ArrowUp.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!hoveredRef.current) return;
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      jump();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

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
            ? "Ouch — that one got you."
            : state === "paused"
              ? "Paused. Take your time."
              : state === "running"
                ? "Jump the gaps."
                : "A little something while you wait."}
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
            jump();
          }}
          style={{ aspectRatio: `${W} / ${H}` }}
          className="w-full cursor-pointer touch-none select-none"
          aria-label="Mini runner game — press space or tap to jump"
          role="img"
        />

        {state !== "running" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-medium text-background">
              {state === "idle"
                ? "Tap or press Space to play"
                : state === "paused"
                  ? "Paused"
                  : `Score ${score} — tap to try again`}
            </span>
          </div>
        )}
      </div>

      {/* The controls the whole site is named after. */}
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
          onClick={() => {
            dataRef.current = createGame();
            setScore(0);
            setGameState("running");
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Restart
        </button>
      </div>
    </div>
  );
}
