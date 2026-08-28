// Pure simulation for "Freeze-Frame Dodger" — unlike the runner (where Pause
// is just a stop-the-clock convenience), here Pause is the actual gameplay
// verb: it freezes every gate's oscillation and the world scroll, so the
// player can line up a safe crossing with zero time pressure, then Resume
// to commit. As with runner-game.ts, this is kept separate from rendering
// so the whole loop (including the pause-freezes-the-world rule) can be
// tested headlessly — requestAnimationFrame never fires in a hidden tab.

export const W = 620;
export const H = 150;
export const PLAYER_X = 70;
export const PLAYER_SIZE = 16;
export const PLAYER_SPEED_Y = 3.2;
export const PAD = 8;

export const GATE_W = 14;
export const GATE_GAP_H = 46;
export const GATE_SPACING = 190;
export const NUM_GATES = 3;

export const BASE_SCROLL = 2.6;
export const MAX_SCROLL_BONUS = 2.0;
export const BASE_FREQ = 0.018;
export const MAX_FREQ_BONUS = 0.02;
export const GATE_AMP = 34;
export const GATE_BASELINE = H / 2 + 3; // 75 — see lib comment below for the bounds check

export interface Gate {
  x: number;
  phase: number;
  passed: boolean;
}

export interface DodgeGameData {
  playerY: number;
  gates: Gate[];
  gateClock: number; // only advances while running — this IS the "world freezes" rule
  scrollDistance: number; // only advances while running
  score: number;
  dead: boolean;
}

function initialGates(): Gate[] {
  const gates: Gate[] = [];
  for (let i = 0; i < NUM_GATES; i++) {
    gates.push({
      x: W + i * GATE_SPACING,
      phase: i * 2.1, // spread starting phases so gates don't all move in lockstep
      passed: false,
    });
  }
  return gates;
}

export function createGame(): DodgeGameData {
  return {
    playerY: H / 2,
    gates: initialGates(),
    gateClock: 0,
    scrollDistance: 0,
    score: 0,
    dead: false,
  };
}

function difficultyT(score: number): number {
  // Ramps over the first ~40 gates, then caps — same shape as the runner's
  // speed ramp so the two games feel like they belong together.
  return Math.min(score / 40, 1);
}

export function currentScroll(score: number): number {
  return BASE_SCROLL + difficultyT(score) * MAX_SCROLL_BONUS;
}

export function currentFreq(score: number): number {
  return BASE_FREQ + difficultyT(score) * MAX_FREQ_BONUS;
}

/** The gate's gap centre at the current (possibly frozen) point in time. */
export function gapCenter(gate: Gate, gateClock: number, freq: number): number {
  return GATE_BASELINE + GATE_AMP * Math.sin(gate.phase + gateClock * freq);
}

export function isSafeY(y: number, gate: Gate, gateClock: number, freq: number): boolean {
  const c = gapCenter(gate, gateClock, freq);
  return y > c - GATE_GAP_H / 2 + PLAYER_SIZE / 2 && y < c + GATE_GAP_H / 2 - PLAYER_SIZE / 2;
}

function collides(d: DodgeGameData): boolean {
  const freq = currentFreq(d.score);
  const px1 = PLAYER_X - PLAYER_SIZE / 2;
  const px2 = PLAYER_X + PLAYER_SIZE / 2;
  for (const g of d.gates) {
    const gx1 = g.x;
    const gx2 = g.x + GATE_W;
    if (px2 > gx1 && px1 < gx2) {
      if (!isSafeY(d.playerY, g, d.gateClock, freq)) return true;
    }
  }
  return false;
}

export interface StepInput {
  up: boolean;
  down: boolean;
  running: boolean; // false = paused: world freezes, player can still steer
}

/**
 * Advances one frame. Player steering always applies (that's the whole
 * point of Pause here — you can always reposition); gate motion and world
 * scroll only advance while `running` is true.
 */
export function stepGame(d: DodgeGameData, input: StepInput): DodgeGameData {
  if (d.dead) return d;

  if (input.up) d.playerY -= PLAYER_SPEED_Y;
  if (input.down) d.playerY += PLAYER_SPEED_Y;
  const minY = PAD + PLAYER_SIZE / 2;
  const maxY = H - PAD - PLAYER_SIZE / 2;
  if (d.playerY < minY) d.playerY = minY;
  if (d.playerY > maxY) d.playerY = maxY;

  if (input.running) {
    const scroll = currentScroll(d.score);
    d.gateClock += 1;
    d.scrollDistance += scroll;
    for (const g of d.gates) g.x -= scroll;

    for (const g of d.gates) {
      if (!g.passed && g.x + GATE_W < PLAYER_X - PLAYER_SIZE / 2) {
        g.passed = true;
        d.score += 1;
      }
    }
    // Recycle any gate that's scrolled fully off-screen back to the right,
    // past the current furthest gate, with a fresh random-ish phase.
    for (const g of d.gates) {
      if (g.x + GATE_W < -20) {
        const furthest = Math.max(...d.gates.map((o) => o.x));
        g.x = furthest + GATE_SPACING;
        g.phase = (g.phase + 1.7) % (Math.PI * 2);
        g.passed = false;
      }
    }
  }

  if (collides(d)) d.dead = true;
  return d;
}
