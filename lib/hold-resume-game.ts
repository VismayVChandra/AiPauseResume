// Pure simulation for "Hold to Resume" — no Pause/Resume buttons at all.
// You press and hold on the canvas; time (your own drift toward the drag
// target AND every gate's motion) only exists while your finger is down.
// Lift off and everything freezes solid, including you — no steering
// during a freeze, unlike the other games. A stamina meter drains while
// held and only recovers while released, so holding straight through the
// whole course isn't an option: you're forced into real bursts, using
// releases both as an emergency stop and as the only way to recover.
//
// Gate/gap shape borrows the same oscillating-gap idea as the dodge game,
// but the input model — and the fact that releasing freezes YOU too, not
// just the world — is what's actually new here.

export const W = 620;
export const H = 150;
export const PLAYER_X = 90;
export const PLAYER_SIZE = 14;

export const GATE_W = 14;
export const GATE_GAP_H = 46;
export const GATE_SPACING = 190;
export const NUM_GATES = 3;
export const GATE_AMP = 32;
export const GATE_BASELINE = 75;

export const BASE_SCROLL = 2.6;
export const MAX_SCROLL_BONUS = 1.8;
export const BASE_FREQ = 0.02;
export const MAX_FREQ_BONUS = 0.02;
export const DIFFICULTY_CAP_SCORE = 20;

export const PLAYER_SPEED = 3.4;

export const STAMINA_MAX = 100;
export const STAMINA_DRAIN = STAMINA_MAX / 300; // empties in ~300 held ticks
export const STAMINA_RECOVER = STAMINA_MAX / 400; // refills slower than it drains

export interface Gate {
  x: number;
  phase: number;
  passed: boolean;
}

export interface HoldResumeGameData {
  gates: Gate[];
  gateClock: number;
  playerY: number;
  stamina: number;
  score: number;
  dead: boolean;
  rng: () => number;
}

function difficultyT(score: number): number {
  return Math.min(score / DIFFICULTY_CAP_SCORE, 1);
}

export function currentScroll(score: number): number {
  return BASE_SCROLL + difficultyT(score) * MAX_SCROLL_BONUS;
}

export function currentFreq(score: number): number {
  return BASE_FREQ + difficultyT(score) * MAX_FREQ_BONUS;
}

export function gapCenter(g: Gate, gateClock: number, freq: number): number {
  return GATE_BASELINE + GATE_AMP * Math.sin(gateClock * freq + g.phase);
}

export function createGame(rng: () => number = Math.random): HoldResumeGameData {
  const d: HoldResumeGameData = {
    gates: [],
    gateClock: 0,
    playerY: H / 2,
    stamina: STAMINA_MAX,
    score: 0,
    dead: false,
    rng,
  };
  let x = W + 100;
  for (let i = 0; i < NUM_GATES; i++) {
    d.gates.push({ x, phase: d.rng() * Math.PI * 2, passed: false });
    x += GATE_SPACING;
  }
  return d;
}

/**
 * Advances one tick. `held` is whether the player is currently pressing
 * down; `targetY` is where they're dragging toward (ignored unless
 * held). Releasing freezes everything, including the player's own
 * position — there is no steering while released. Holding with an empty
 * stamina meter also freezes everything (you must actually let go to
 * recover), which is the whole reason bursting is mandatory here.
 */
export function stepGame(d: HoldResumeGameData, held: boolean, targetY: number): HoldResumeGameData {
  if (d.dead) return d;

  if (!held) {
    d.stamina = Math.min(STAMINA_MAX, d.stamina + STAMINA_RECOVER);
    return d;
  }
  if (d.stamina <= 0) {
    return d;
  }

  d.stamina = Math.max(0, d.stamina - STAMINA_DRAIN);

  const dy = targetY - d.playerY;
  const step = Math.max(-PLAYER_SPEED, Math.min(PLAYER_SPEED, dy));
  d.playerY += step;

  d.gateClock += 1;
  const scroll = currentScroll(d.score);
  const freq = currentFreq(d.score);
  for (const g of d.gates) g.x -= scroll;

  while (d.gates.length < NUM_GATES || d.gates[d.gates.length - 1].x < W + 200) {
    const last = d.gates[d.gates.length - 1];
    const nextX = last ? last.x + GATE_SPACING : W + 100;
    d.gates.push({ x: nextX, phase: d.rng() * Math.PI * 2, passed: false });
  }

  for (const g of d.gates) {
    if (!g.passed && g.x < PLAYER_X - GATE_W / 2) {
      g.passed = true;
      d.score += 1;
    }
    if (Math.abs(g.x - PLAYER_X) < GATE_W / 2) {
      const c = gapCenter(g, d.gateClock, freq);
      const top = c - GATE_GAP_H / 2;
      const bottom = c + GATE_GAP_H / 2;
      if (d.playerY - PLAYER_SIZE / 2 < top || d.playerY + PLAYER_SIZE / 2 > bottom) {
        d.dead = true;
      }
    }
  }

  d.gates = d.gates.filter((g) => g.x > PLAYER_X - 60);

  return d;
}
