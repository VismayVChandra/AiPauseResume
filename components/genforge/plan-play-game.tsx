"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGame,
  stepGame,
  setPlanLane,
  startNextRound,
  blockedLanesFor,
  type PlanPlayGameData,
  LANES,
} from "@/lib/plan-play-game";

// Fifth game, and the one with no live control at all. While Paused, the
// hazards are frozen and you tap out a full route — one lane per upcoming
// segment — with zero clock running. Resume, and your character runs
// exactly that route while the hazards resume rotating in real time; you
// aren't steering anything, you're watching your own plan meet reality.
// Clear a round and it auto-pauses again for the next stretch. Press
// Pause mid-run and everything freezes again so you can revise whatever's
// still ahead — the part you've already run stays locked in. Simulation
// lives in lib/plan-play-game.ts, tested headlessly (rAF does not run in
// a hidden tab in this environment).

type GameState = "idle" | "running" | "paused" | "over";

const HIGH_SCORE_KEY = "pauseresume_planplay_best";
const GRID_LEFT = 34;
const GRID_RIGHT = 596;
const LANE_Y = [34, 75, 116];
const CELL_H = 32;

export function PlanPlayGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<PlanPlayGameData>(createGame());
  const stateRef = useRef<GameState>("idle");
  const rafRef = useRef<number | null>(null);
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
    setGameState("paused");
  }, []);

  const pause = useCallback(() => {
    if (stateRef.current !== "running") return;
    setGameState("paused");
  }, []);

  function playerPos(d: PlanPlayGameData): { x: number; y: number } {
    const segW = (GRID_RIGHT - GRID_LEFT) / d.roundLength;
    if (d.execIndex === 0 && d.execTick === 0) {
      return { x: GRID_LEFT - 14, y: LANE_Y[1] };
    }
    if (d.execIndex >= d.roundLength) {
      const lastLane = d.plan[d.roundLength - 1] ?? 1;
      return { x: GRID_RIGHT + 10, y: LANE_Y[lastLane] };
    }
    const prevLane = d.execIndex === 0 ? 1 : d.plan[d.execIndex - 1];
    const curLane = d.plan[d.execIndex];
    const progress = d.execTick / d.segmentTicks;
    return {
      x: GRID_LEFT + d.execIndex * segW + progress * segW,
      y: LANE_Y[prevLane] + (LANE_Y[curLane] - LANE_Y[prevLane]) * progress,
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 620 * dpr;
    canvas.height = 150 * dpr;
    ctx.scale(dpr, dpr);

    function render() {
      const d = dataRef.current;
      const p = paletteRef.current;
      ctx.clearRect(0, 0, 620, 150);

      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 619, 149);

      const segW = (GRID_RIGHT - GRID_LEFT) / d.roundLength;

      // lane guide lines
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      for (const ly of LANE_Y) {
        ctx.beginPath();
        ctx.moveTo(GRID_LEFT, ly);
        ctx.lineTo(GRID_RIGHT, ly);
        ctx.stroke();
      }

      for (let i = 0; i < d.roundLength; i++) {
        const cellX = GRID_LEFT + i * segW + 1.5;
        const cellW = segW - 3;
        const blocked = blockedLanesFor(d, i);
        const isPast = i < d.execIndex;
        const isLive = i === d.execIndex && stateRef.current === "running";

        ctx.globalAlpha = isPast ? 0.35 : 1;

        if (isLive) {
          ctx.fillStyle = p.brand;
          ctx.globalAlpha = (isPast ? 0.35 : 1) * 0.08;
          ctx.fillRect(cellX, 4, cellW, 142);
          ctx.globalAlpha = isPast ? 0.35 : 1;
        }

        for (let lane = 0; lane < LANES; lane++) {
          const cellY = LANE_Y[lane] - CELL_H / 2;
          if (blocked.includes(lane)) {
            ctx.fillStyle = p.ink;
            ctx.globalAlpha = (isPast ? 0.35 : 1) * 0.85;
            ctx.beginPath();
            ctx.roundRect(cellX, cellY, cellW, CELL_H, 3);
            ctx.fill();
            ctx.globalAlpha = isPast ? 0.35 : 1;
          }
          if (d.plan[i] === lane) {
            ctx.fillStyle = p.brand;
            ctx.beginPath();
            ctx.arc(cellX + cellW / 2, LANE_Y[lane], 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;

      const pos = playerPos(d);
      ctx.fillStyle = d.dead ? p.ink : p.brand;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame() {
      const d = dataRef.current;
      stepGame(d, stateRef.current === "running");
      if (stateRef.current === "running") {
        if (d.dead) {
          setScore(d.score);
          commitBest(d.score);
          setGameState("over");
        } else {
          setScore(d.score);
          if (d.execIndex >= d.roundLength) {
            startNextRound(d);
            setGameState("paused");
          }
        }
      }
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [commitBest]);

  const canPause = state === "running";
  const canResume = state === "paused";

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const s = stateRef.current;
    if (s === "idle" || s === "over") {
      start();
      return;
    }
    if (s !== "paused") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 620;
    const y = ((e.clientY - rect.top) / rect.height) * 150;
    if (x < GRID_LEFT || x > GRID_RIGHT) return;
    const d = dataRef.current;
    const segW = (GRID_RIGHT - GRID_LEFT) / d.roundLength;
    const segIdx = Math.min(d.roundLength - 1, Math.max(0, Math.floor((x - GRID_LEFT) / segW)));
    if (segIdx < d.execIndex) return;
    let lane = 0;
    let bestDist = Infinity;
    LANE_Y.forEach((ly, i) => {
      const dist = Math.abs(y - ly);
      if (dist < bestDist) {
        bestDist = dist;
        lane = i;
      }
    });
    setPlanLane(d, segIdx, lane);
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {state === "over"
            ? "Route ran into a blocked lane."
            : state === "paused"
              ? "Tap a lane per column, then Resume."
              : state === "running"
                ? "Watching your plan play out."
                : "Every hazard here is frozen until you say go."}
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
          onPointerDown={handlePointerDown}
          style={{ aspectRatio: "620 / 150" }}
          className="w-full cursor-pointer touch-none select-none"
          aria-label="Plan and play — tap a lane per column while paused to draw a route, Resume to run it"
          role="img"
        />

        {state !== "running" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-medium text-background">
              {state === "idle"
                ? "Tap to start planning"
                : state === "paused"
                  ? "Planning — tap the grid"
                  : `Score ${score} — tap to try again`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={pause}
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
