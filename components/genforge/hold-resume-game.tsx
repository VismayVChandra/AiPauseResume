"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import {
  createGame,
  stepGame,
  gapCenter,
  currentFreq,
  type HoldResumeGameData,
  type Gate,
  W,
  H,
  PLAYER_X,
  PLAYER_SIZE,
  GATE_W,
  STAMINA_MAX,
} from "@/lib/hold-resume-game";

// Sixth game, and the only one with no Pause/Resume buttons at all. You
// press and hold directly on the canvas; time — your own drift toward
// wherever you're dragging, and every gate's motion — only exists while
// your finger is down. Lift off and everything freezes solid, including
// you: unlike every other game here, there's no steering during a
// freeze, only during a hold. A stamina meter empties as you hold and
// only refills once you let go, so holding straight through the whole
// course isn't available as a strategy — you're forced into real bursts.
// Simulation lives in lib/hold-resume-game.ts, tested headlessly (rAF
// does not run in a hidden tab in this environment).

type GameState = "idle" | "active" | "over";

const HIGH_SCORE_KEY = "pauseresume_hold_best";

export function HoldResumeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<HoldResumeGameData>(createGame());
  const stateRef = useRef<GameState>("idle");
  const rafRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const targetYRef = useRef(H / 2);
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
    setGameState("active");
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

    function drawPlayer(y: number, held: boolean) {
      const p = paletteRef.current;
      ctx.fillStyle = held ? p.brand : p.ink;
      ctx.beginPath();
      ctx.arc(PLAYER_X, y, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawGate(g: Gate, gateClock: number, freq: number) {
      const p = paletteRef.current;
      const c = gapCenter(g, gateClock, freq);
      const gapTop = c - 23;
      const gapBottom = c + 23;
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
      const held = heldRef.current && stateRef.current === "active";
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      const freq = currentFreq(d.score);
      for (const g of d.gates) drawGate(g, d.gateClock, freq);
      drawPlayer(d.playerY, held);

      // stamina bar
      const barW = 120;
      const barX = W - barW - 10;
      const barY = 10;
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, 6, 3);
      ctx.stroke();
      const frac = Math.max(0, Math.min(1, d.stamina / STAMINA_MAX));
      ctx.fillStyle = frac > 0.2 ? p.brand : p.ink;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * frac, 6, 3);
      ctx.fill();
    }

    function frame() {
      const d = dataRef.current;
      const held = heldRef.current && stateRef.current === "active";
      stepGame(d, held, targetYRef.current);
      if (stateRef.current === "active") {
        if (d.dead) {
          setScore(d.score);
          commitBest(d.score);
          setGameState("over");
          heldRef.current = false;
        } else {
          setScore(d.score);
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

  function yFromEvent(e: React.PointerEvent<HTMLCanvasElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientY - rect.top) / rect.height) * H;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (stateRef.current === "idle" || stateRef.current === "over") {
      start();
    }
    heldRef.current = true;
    targetYRef.current = yFromEvent(e);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!heldRef.current) return;
    targetYRef.current = yFromEvent(e);
  }
  function release() {
    heldRef.current = false;
  }

  const stamina = dataRef.current.stamina;
  const staminaLow = stamina < STAMINA_MAX * 0.2;

  return (
    <div className="w-full rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {state === "over"
            ? "Let go at the wrong moment."
            : staminaLow && state === "active"
              ? "Running low — release to recover."
              : "Hold anywhere on it to move. Let go and everything freezes — you included."}
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
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          style={{ aspectRatio: `${W} / ${H}` }}
          className="w-full cursor-pointer touch-none select-none"
          aria-label="Hold to resume — press and hold anywhere on it to move, release to freeze"
          role="img"
        />

        {state !== "active" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-medium text-background">
              {state === "idle" ? "Press and hold to begin" : `Score ${score} — press and hold to try again`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          No buttons here — just press and hold.
        </span>
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
