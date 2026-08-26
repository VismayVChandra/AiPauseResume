// Pure simulation for the little runner on the loading screen. Deliberately
// separated from the canvas component: rendering needs a browser, but the
// physics, spawning, scoring and collision are plain arithmetic that can be
// tested headlessly — which matters here because requestAnimationFrame
// doesn't run in a hidden tab, so the loop itself can't be exercised in CI
// or a headless check.

export const W = 620;
export const H = 150;
export const GROUND_Y = 118;
export const GRAVITY = 0.55;
export const JUMP_V = -9.6;
export const PLAYER_X = 58;
export const PLAYER_W = 20;
export const PLAYER_H = 26;
export const BASE_SPEED = 5.2;
export const MAX_SPEED_BONUS = 4.2;
export const FLOOR_Y = GROUND_Y - PLAYER_H;

export interface Obstacle {
  x: number;
  w: number;
  h: number;
}

export interface GameData {
  y: number;
  vy: number;
  obstacles: Obstacle[];
  speed: number;
  ticks: number;
  spawnIn: number;
  groundOffset: number;
  dead: boolean;
}

export function createGame(): GameData {
  return {
    y: FLOOR_Y,
    vy: 0,
    obstacles: [],
    speed: BASE_SPEED,
    ticks: 0,
    spawnIn: 60,
    groundOffset: 0,
    dead: false,
  };
}

export function isGrounded(d: GameData): boolean {
  return d.y >= FLOOR_Y - 0.5;
}

/** Jump only from the ground — no mid-air double jumps. */
export function tryJump(d: GameData): boolean {
  if (!isGrounded(d)) return false;
  d.vy = JUMP_V;
  return true;
}

export function displayScore(d: GameData): number {
  return Math.floor(d.ticks / 3);
}

/**
 * Advances one frame. `rand` is injectable so tests can drive deterministic
 * (and worst-case) obstacle layouts instead of hoping random coverage finds
 * an unplayable configuration.
 */
export function stepGame(d: GameData, rand: () => number = Math.random): GameData {
  if (d.dead) return d;

  d.vy += GRAVITY;
  d.y += d.vy;
  if (d.y > FLOOR_Y) {
    d.y = FLOOR_Y;
    d.vy = 0;
  }

  d.groundOffset += d.speed;
  d.speed = BASE_SPEED + Math.min(d.ticks / 260, MAX_SPEED_BONUS);

  d.spawnIn -= 1;
  if (d.spawnIn <= 0) {
    const h = 22 + rand() * 20;
    const w = 12 + rand() * 10;
    d.obstacles.push({ x: W + 20, w, h });
    // Spacing tightens as it speeds up but never below a clearable gap —
    // see the playability test for why this floor exists.
    const minGap = Math.max(52, 92 - d.speed * 5);
    d.spawnIn = Math.round(minGap + rand() * 55);
  }

  for (const o of d.obstacles) o.x -= d.speed;
  d.obstacles = d.obstacles.filter((o) => o.x + o.w > -20);

  d.ticks += 1;

  if (collides(d)) d.dead = true;
  return d;
}

/** Small inset on the player box so near-misses read as fair. */
export function collides(d: GameData): boolean {
  const px1 = PLAYER_X + 2;
  const px2 = PLAYER_X + PLAYER_W - 2;
  const py1 = d.y + 2;
  const py2 = d.y + PLAYER_H;
  for (const o of d.obstacles) {
    const oy1 = GROUND_Y - o.h;
    if (px2 > o.x && px1 < o.x + o.w && py2 > oy1 && py1 < GROUND_Y) return true;
  }
  return false;
}

/**
 * Continuous-motion approximation of jump height. The real simulation steps
 * in discrete frames, so the actual peak lands a few px lower — use
 * measuredJumpPeak() when the exact clearance matters.
 */
export function maxJumpHeight(): number {
  return (JUMP_V * JUMP_V) / (2 * GRAVITY);
}

/** The peak a jump actually reaches under discrete frame stepping. */
export function measuredJumpPeak(): number {
  let y = FLOOR_Y;
  let vy = JUMP_V;
  let peak = FLOOR_Y;
  for (let i = 0; i < 500; i++) {
    vy += GRAVITY;
    y += vy;
    if (y > FLOOR_Y) break;
    peak = Math.min(peak, y);
  }
  return FLOOR_Y - peak;
}

/** Roughly how many frames a full jump arc lasts. */
export function jumpAirtimeFrames(): number {
  return (2 * Math.abs(JUMP_V)) / GRAVITY;
}
