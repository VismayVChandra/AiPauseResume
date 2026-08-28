// Pure simulation for "Split Self" — an auto-runner where Pause doesn't
// just stop the clock, it PLANTS a piece of you as permanent ground
// exactly where you're standing (even mid-air, over a pit). Some pits are
// wider than a single jump can clear; the only way across is to jump,
// press Pause partway over the gap (freezing yourself into a stepping
// stone), then Resume and jump again from there. Pause is the tool you
// build the level with, not a convenience on top of it.
//
// Timing is real: horizontal position only advances while `running`, so
// WHEN you press Pause mid-flight determines WHERE the platform lands —
// too early and the second jump still comes up short; too late and
// you've wasted the first jump's reach. Deterministic gravity/jump arc,
// injectable RNG for pit width/spacing jitter, same shape as the other
// three games' lib modules.

export const W = 620;
export const H = 150;
export const GROUND_Y = 118;
export const PLAYER_X = 90;
export const PLAYER_SIZE = 14;

export const GRAVITY = 0.6;
export const JUMP_VELOCITY = -9;
export const RUN_SPEED = 3;

// Horizontal distance covered by one full unaided jump (takeoff back to
// ground height): t = 2*|v0|/g ticks, distance = RUN_SPEED * t.
export const JUMP_RANGE = RUN_SPEED * ((2 * Math.abs(JUMP_VELOCITY)) / GRAVITY);

export const PLATFORM_W = 22;
export const MIN_PIT_W = 60;
export const MAX_PIT_W = 145;
export const DIFFICULTY_CAP_INDEX = 14;
export const PIT_SPACING_MIN = 170;
export const PIT_SPACING_MAX = 260;

export interface Pit {
  x: number;
  w: number;
  scored: boolean;
}

export interface Platform {
  x: number;
  w: number;
}

export interface SplitGameData {
  scrollX: number;
  playerY: number;
  vy: number;
  grounded: boolean;
  pits: Pit[];
  platforms: Platform[];
  score: number;
  dead: boolean;
  nextPitAt: number;
  rng: () => number;
}

export function createGame(rng: () => number = Math.random): SplitGameData {
  return {
    scrollX: 0,
    playerY: GROUND_Y,
    vy: 0,
    grounded: true,
    pits: [],
    platforms: [],
    score: 0,
    dead: false,
    nextPitAt: 260,
    rng,
  };
}

function difficultyT(index: number): number {
  return Math.min(index / DIFFICULTY_CAP_INDEX, 1);
}

export function pitWidthFor(index: number, rng: () => number): number {
  const t = difficultyT(index);
  const base = MIN_PIT_W + t * (MAX_PIT_W - MIN_PIT_W);
  const jitter = (rng() - 0.5) * 16;
  return Math.max(MIN_PIT_W, Math.min(MAX_PIT_W, base + jitter));
}

function spacingFor(index: number, rng: () => number): number {
  const t = difficultyT(index);
  const base = PIT_SPACING_MAX - t * (PIT_SPACING_MAX - PIT_SPACING_MIN);
  return base + rng() * 40;
}

function insideAny(list: { x: number; w: number }[], worldX: number): boolean {
  return list.some((seg) => worldX >= seg.x && worldX <= seg.x + seg.w);
}

/** Ground is solid everywhere except inside a pit — unless a planted
 * platform tile covers that stretch of the pit. */
export function isSolidAt(d: SplitGameData, worldX: number): boolean {
  if (!insideAny(d.pits, worldX)) return true;
  return insideAny(d.platforms, worldX);
}

export function tryJump(d: SplitGameData): void {
  if (d.dead || !d.grounded) return;
  d.vy = JUMP_VELOCITY;
  d.grounded = false;
}

/** Pause's actual effect: freeze yourself into a solid tile exactly where
 * you are right now, airborne or not, and stand on it. */
export function plant(d: SplitGameData): void {
  if (d.dead) return;
  const worldX = d.scrollX + PLAYER_X;
  d.platforms.push({ x: worldX - PLATFORM_W / 2, w: PLATFORM_W });
  d.playerY = GROUND_Y;
  d.vy = 0;
  d.grounded = true;
}

export function stepGame(d: SplitGameData, running: boolean): SplitGameData {
  if (d.dead || !running) return d;

  d.scrollX += RUN_SPEED;

  while (d.nextPitAt - d.scrollX < W + 100) {
    const w = pitWidthFor(d.pits.length, d.rng);
    d.pits.push({ x: d.nextPitAt, w, scored: false });
    d.nextPitAt += w + spacingFor(d.pits.length, d.rng);
  }

  d.vy += GRAVITY;
  d.playerY += d.vy;

  const worldX = d.scrollX + PLAYER_X;
  const solidHere = isSolidAt(d, worldX);

  if (d.playerY >= GROUND_Y) {
    if (solidHere) {
      d.playerY = GROUND_Y;
      d.vy = 0;
      d.grounded = true;
    } else {
      d.grounded = false;
      if (d.playerY > H) d.dead = true;
    }
  } else {
    d.grounded = false;
  }

  for (const p of d.pits) {
    if (!p.scored && worldX > p.x + p.w) {
      p.scored = true;
      d.score += 1;
    }
  }

  d.pits = d.pits.filter((p) => p.x + p.w > d.scrollX - 50);
  d.platforms = d.platforms.filter((p) => p.x + p.w > d.scrollX - 50);

  return d;
}
