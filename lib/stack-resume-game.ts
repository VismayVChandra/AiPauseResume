// Pure simulation for "Stack the Resume" — a classic block-stacking game
// (drop a sliding block onto the one below, trimmed to the overlap) themed
// as building a resume section by section. The Pause/Resume angle here is
// distinct from the other two games: there's no reflex jump or steering,
// just a block sweeping back and forth. Pause freezes the sweep so you can
// evaluate the current alignment with zero time pressure; Resume lets it
// keep sweeping toward a better spot. Dropping (committing) works whether
// paused or running — pausing is how you aim, dropping is the actual shot.
//
// Deterministic (a triangle-wave bounce, no RNG involved at all), which
// makes this the simplest of the three to reason about and test.

export const W = 620;
export const H = 150;
export const BASE_W = 96;
export const BASE_SPEED = 1.8;
export const MAX_SPEED_BONUS = 2.6;
export const DIFFICULTY_CAP_SCORE = 30;

export const SECTION_LABELS = [
  "Header",
  "Summary",
  "Experience",
  "Skills",
  "Projects",
  "Education",
  "Certifications",
] as const;

export interface PlacedBlock {
  x: number;
  w: number;
  label: string;
}

export interface SweepBlock {
  x: number;
  w: number;
  dir: 1 | -1;
}

export interface StackGameData {
  blocks: PlacedBlock[]; // bottom-to-top; blocks[0] is the fixed base
  current: SweepBlock;
  score: number;
  dead: boolean;
}

export function createGame(): StackGameData {
  const base: PlacedBlock = { x: (W - BASE_W) / 2, w: BASE_W, label: "Header" };
  return {
    blocks: [base],
    current: { x: 0, w: BASE_W, dir: 1 },
    score: 0,
    dead: false,
  };
}

function difficultyT(score: number): number {
  return Math.min(score / DIFFICULTY_CAP_SCORE, 1);
}

export function currentSpeed(score: number): number {
  return BASE_SPEED + difficultyT(score) * MAX_SPEED_BONUS;
}

/** Advances the sweep one tick. Only moves while `running` — that's the
 * entire "pause freezes the world" rule for this game. */
export function stepGame(d: StackGameData, running: boolean): StackGameData {
  if (d.dead || !running) return d;
  const speed = currentSpeed(d.score);
  const c = d.current;
  c.x += c.dir * speed;
  const maxX = W - c.w;
  if (c.x <= 0) {
    c.x = 0;
    c.dir = 1;
  } else if (c.x >= maxX) {
    c.x = maxX;
    c.dir = -1;
  }
  return d;
}

/**
 * Commits the current sweep position onto the stack. Returns true on a
 * successful placement (even a sliver of overlap counts, same as the
 * genre's classic rules), false if it missed entirely — which also marks
 * the game dead.
 */
export function commitDrop(d: StackGameData): boolean {
  if (d.dead) return false;
  const top = d.blocks[d.blocks.length - 1];
  const curLeft = d.current.x;
  const curRight = d.current.x + d.current.w;
  const topLeft = top.x;
  const topRight = top.x + top.w;
  const overlapLeft = Math.max(curLeft, topLeft);
  const overlapRight = Math.min(curRight, topRight);
  const overlapW = overlapRight - overlapLeft;

  if (overlapW <= 0) {
    d.dead = true;
    return false;
  }

  const label = SECTION_LABELS[d.blocks.length % SECTION_LABELS.length];
  d.blocks.push({ x: overlapLeft, w: overlapW, label });
  d.score += 1;
  d.current = { x: 0, w: overlapW, dir: 1 };
  return true;
}
