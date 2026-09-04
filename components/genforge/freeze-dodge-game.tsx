"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGame,
  stepGame,
  gapCenter,
  currentFreq,
  type DodgeGameData,
  type Gate,
  W,
  H,
  PLAYER_X,
  PLAYER_SIZE,
  GATE_W,
  GATE_GAP_H,
} from "@/lib/freeze-dodge-game";
import { useGamePalette } from "@/lib/use-game-palette";

// Where the runner uses Pause as a stop-the-clock convenience, here Pause
// is the actual puzzle: it freezes every gate's swing (and the scroll)
// instantly, so you can line up a safe crossing with no time pressure —
// then Resume to commit, at which point the gate you're lined up with
// starts moving again. All simulation lives in lib/freeze-dodge-game.ts,
// tested headlessly for the same reason as the runner (rAF never fires in
// a hidden tab, so this loop can't be exercised by an automated check).

type GameState = "idle" | "running" | "paused" | "over";

const HIGH_SCORE_KEY = "pauseresume_dodge_best";

export function FreezeDodgeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<DodgeGameData>(createGame());
  const stateRef = useRef<GameState>("idle");
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef({ up: false, down: false });
  const pointerTargetRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const paletteRef = useGamePalette();

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

    function drawPlayer(y: number) {
      const p = paletteRef.current;
      // the token is a little pause icon — you ARE the pause button here
      ctx.fillStyle = p.brand;
      ctx.beginPath();
      ctx.roundRect(PLAYER_X - PLAYER_SIZE / 2, y - PLAYER_SIZE / 2, 5, PLAYER_SIZE, 1.5);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(PLAYER_X + PLAYER_SIZE / 2 - 5, y - PLAYER_SIZE / 2, 5, PLAYER_SIZE, 1.5);
      ctx.fill();
    }

    function drawGate(g: Gate, gateClock: number, freq: number) {
      const p = paletteRef.current;
      const c = gapCenter(g, gateClock, freq);
      const gapTop = c - GATE_GAP_H / 2;
      const gapBottom = c + GATE_GAP_H / 2;
      ctx.fillStyle = p.ink;
      ctx.beginPath();
      ctx.roundRect(g.x, 0, GATE_W, Math.max(gapTop, 0), 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(g.x, gapBottom, GATE_W, Math.max(H - gapBottom, 0), 2);
      ctx.fill();
    }

    function render() {
      const d = dataRef.current;
      const p = paletteRef.current;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      const freq = currentFreq(d.score);
      for (const g of d.gates) drawGate(g, d.gateClock, freq);
      drawPlayer(d.playerY);

      // a faint trail showing the gap's swing range, for readability
      ctx.strokeStyle = p.muted;
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PLAYER_X, 0);
      ctx.lineTo(PLAYER_X, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function step() {
      const d = dataRef.current;
      const up = keysRef.current.up || (pointerTargetRef.current !== null && d.playerY - pointerTargetRef.current > 2);
      const down = keysRef.current.down || (pointerTargetRef.current !== null && pointerTargetRef.current - d.playerY > 2);
      const running = stateRef.current === "running";
      stepGame(d, { up, down, running });

      if (d.dead) {
        setScore(d.score);
        commitBest(d.score);
        setGameState("over");
        return;
      }
      setScore(d.score);
    }

    function frame() {
      // Steering always applies (even paused) — only advancing the world
      // is gated on "running", handled inside stepGame itself.
      if (stateRef.current === "running" || stateRef.current === "paused") step();
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [commitBest]);

  // Scoped to hover so this game and the runner above it don't both react
  // to the same arrow-key press when they're stacked on one page.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!hoveredRef.current) return;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        keysRef.current.up = true;
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        keysRef.current.down = true;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "ArrowUp" || e.code === "KeyW") keysRef.current.up = false;
      else if (e.code === "ArrowDown" || e.code === "KeyS") keysRef.current.down = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const canPause = state === "running";
  const canResume = state === "paused";

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    // Keeps pointermove/pointerup targeting this canvas even once the
    // finger drags outside its (small, especially on mobile) bounds —
    // without this, a short canvas makes it trivial to overshoot while
    // steering, which used to silently drop control mid-drag. Guarded:
    // the spec throws if the pointerId isn't currently "active" (an edge
    // case a defensive try/catch costs nothing to rule out), and a
    // capture failure should never block the rest of this handler.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no capture this time — steering still works, just won't survive
      // the finger leaving the canvas bounds
    }
    if (state === "idle" || state === "over") {
      start();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    pointerTargetRef.current = ((e.clientY - rect.top) / rect.height) * H;
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerTargetRef.current === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerTargetRef.current = ((e.clientY - rect.top) / rect.height) * H;
  }
  function clearPointer() {
    pointerTargetRef.current = null;
  }

  return (
    <div
      className="w-full rounded-xl border border-border bg-card p-3"
      onPointerEnter={() => (hoveredRef.current = true)}
      onPointerLeave={() => {
        hoveredRef.current = false;
        keysRef.current.up = false;
        keysRef.current.down = false;
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {state === "over"
            ? "Caught mid-swing."
            : state === "paused"
              ? "World frozen — line up, then Resume."
              : state === "running"
                ? "Steer through the gaps."
                : "Pause freezes every gate — plan your crossing."}
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
          onPointerMove={handlePointerMove}
          onPointerUp={clearPointer}
          onPointerCancel={clearPointer}
          style={{ aspectRatio: `${W} / ${H}` }}
          className="w-full cursor-pointer touch-none select-none"
          aria-label="Freeze-frame dodging game — hold up/down or drag to steer, tap to start"
          role="img"
        />

        {state !== "running" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-medium text-background">
              {state === "idle"
                ? "Tap to start, drag or ↑↓ to steer"
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
