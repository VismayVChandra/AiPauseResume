"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGame,
  stepGame,
  tryJump,
  plant,
  type SplitGameData,
  W,
  H,
  GROUND_Y,
  PLAYER_X,
  PLAYER_SIZE,
  PLATFORM_W,
} from "@/lib/split-self-game";
import { useGamePalette } from "@/lib/use-game-palette";

// Fourth game, and the one where Pause stops being a convenience and
// becomes the actual building material: pressing it freezes YOU into a
// solid tile exactly where you are — airborne over a gap included — so a
// pit too wide for one jump gets crossed by jumping, pausing mid-flight to
// plant a stepping stone, then resuming and jumping again from there.
// Simulation lives in lib/split-self-game.ts, tested headlessly (rAF does
// not run in a hidden tab in this environment).

type GameState = "idle" | "running" | "paused" | "over";

const HIGH_SCORE_KEY = "pauseresume_split_best";

export function SplitSelfGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<SplitGameData>(createGame());
  const stateRef = useRef<GameState>("idle");
  const rafRef = useRef<number | null>(null);
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

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s === "idle" || s === "over") {
      start();
      return;
    }
    if (s !== "running") return;
    tryJump(dataRef.current);
  }, [start]);

  const pause = useCallback(() => {
    if (stateRef.current !== "running") return;
    plant(dataRef.current);
    setGameState("paused");
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
      ctx.fillStyle = p.brand;
      ctx.beginPath();
      ctx.roundRect(PLAYER_X - PLAYER_SIZE / 2, y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE, 3);
      ctx.fill();
    }

    function drawPlantedTile(screenX: number) {
      const p = paletteRef.current;
      ctx.fillStyle = p.ink;
      ctx.beginPath();
      ctx.roundRect(screenX, GROUND_Y - 3, PLATFORM_W, 6, 2);
      ctx.fill();
      // a little pause-icon on it: this tile IS a frozen you
      ctx.fillStyle = p.paper;
      const barW = 1.6;
      const cx = screenX + PLATFORM_W / 2;
      ctx.fillRect(cx - 3.5, GROUND_Y - 1.8, barW, 3.6);
      ctx.fillRect(cx + 1.9, GROUND_Y - 1.8, barW, 3.6);
    }

    function render() {
      const d = dataRef.current;
      const p = paletteRef.current;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      // ground, with gaps where pits are (unless covered by a planted tile)
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 2;
      const worldLeft = d.scrollX;
      const worldRight = d.scrollX + W;
      let cursor = worldLeft;
      const covers: { x: number; w: number }[] = [...d.pits]
        .filter((pit) => pit.x + pit.w > worldLeft && pit.x < worldRight)
        .sort((a, b) => a.x - b.x);
      for (const pit of covers) {
        if (pit.x > cursor) {
          ctx.beginPath();
          ctx.moveTo(cursor - worldLeft, GROUND_Y);
          ctx.lineTo(pit.x - worldLeft, GROUND_Y);
          ctx.stroke();
        }
        cursor = Math.max(cursor, pit.x + pit.w);
      }
      if (cursor < worldRight) {
        ctx.beginPath();
        ctx.moveTo(cursor - worldLeft, GROUND_Y);
        ctx.lineTo(worldRight - worldLeft, GROUND_Y);
        ctx.stroke();
      }

      for (const tile of d.platforms) {
        if (tile.x + tile.w < worldLeft || tile.x > worldRight) continue;
        drawPlantedTile(tile.x - worldLeft);
      }

      drawPlayer(d.playerY);
    }

    function frame() {
      const d = dataRef.current;
      stepGame(d, stateRef.current === "running");
      if (d.dead && stateRef.current === "running") {
        setScore(d.score);
        commitBest(d.score);
        setGameState("over");
      } else if (stateRef.current === "running") {
        setScore(d.score);
      }
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [commitBest]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!hoveredRef.current) return;
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      jump();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
            ? "Fell short."
            : state === "paused"
              ? "You're planted — Resume, then jump onward."
              : state === "running"
                ? "Jump the gaps. Too wide? Pause mid-air to plant a landing."
                : "Pause freezes YOU into solid ground, mid-air included."}
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
          aria-label="Split self — tap or press Space to jump, Pause mid-air to plant a stepping stone"
          role="img"
        />

        {state !== "running" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-foreground/85 px-3 py-1.5 text-[11px] font-medium text-background">
              {state === "idle"
                ? "Tap or Space to start"
                : state === "paused"
                  ? "Planted"
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
