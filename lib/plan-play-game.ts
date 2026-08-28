// Pure simulation for "Plan & Play" — the game with zero live control.
// While Paused, every hazard's rotation is frozen and you tap out a full
// route (one lane per upcoming segment) with no clock running at all.
// Press Resume and your character runs that exact route, segment by
// segment, while the hazards resume rotating in real time — you're purely
// watching your own plan meet reality. Clear the round and it auto-pauses
// again for the next stretch; press Pause mid-run and the hazards freeze
// again so you can revise whatever you haven't reached yet.
//
// Deterministic hazard motion (a simple per-segment lane rotation, no
// RNG involved in the collision itself — only round shape/phase is
// seeded), which makes "is this route actually safe" fully computable
// from the frozen state, same as a human is meant to compute it.

export const LANES = 3;

export const SEGMENT_TICKS_BASE = 42;
export const SEGMENT_TICKS_MIN = 22;
export const ROUND_LENGTH_MIN = 4;
export const ROUND_LENGTH_MAX = 8;
export const DIFFICULTY_CAP_SCORE = 24;
export const TWO_STREAM_SCORE = 10;

export interface HazardStream {
  startLane: number;
  dir: 1 | -1;
}

export interface PlanPlayGameData {
  score: number;
  dead: boolean;
  roundLength: number;
  segmentTicks: number;
  plan: number[];
  streams: HazardStream[];
  execIndex: number;
  execTick: number;
  rng: () => number;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Which lanes are blocked for the segment at index `segIdx` of the
 * current round, derived purely from the round's fixed hazard streams. */
export function blockedLanesFor(d: PlanPlayGameData, segIdx: number): number[] {
  const set = new Set<number>();
  for (const s of d.streams) {
    set.add(mod(s.startLane + s.dir * segIdx, LANES));
  }
  return Array.from(set);
}

function difficultyT(score: number): number {
  return Math.min(score / DIFFICULTY_CAP_SCORE, 1);
}

function segmentTicksFor(score: number): number {
  const t = difficultyT(score);
  return Math.round(SEGMENT_TICKS_BASE - t * (SEGMENT_TICKS_BASE - SEGMENT_TICKS_MIN));
}

function roundLengthFor(score: number): number {
  const t = difficultyT(score);
  return Math.round(ROUND_LENGTH_MIN + t * (ROUND_LENGTH_MAX - ROUND_LENGTH_MIN));
}

function setUpRound(d: PlanPlayGameData): void {
  d.roundLength = roundLengthFor(d.score);
  d.segmentTicks = segmentTicksFor(d.score);
  const streamCount = d.score >= TWO_STREAM_SCORE ? 2 : 1;
  d.streams = [];
  for (let k = 0; k < streamCount; k++) {
    d.streams.push({
      startLane: Math.floor(d.rng() * LANES),
      dir: d.rng() < 0.5 ? 1 : -1,
    });
  }
  d.plan = new Array(d.roundLength).fill(1); // default: middle lane
  d.execIndex = 0;
  d.execTick = 0;
}

export function createGame(rng: () => number = Math.random): PlanPlayGameData {
  const d: PlanPlayGameData = {
    score: 0,
    dead: false,
    roundLength: 0,
    segmentTicks: 0,
    plan: [],
    streams: [],
    execIndex: 0,
    execTick: 0,
    rng,
  };
  setUpRound(d);
  return d;
}

/** Called once the round in progress is fully cleared, to set up the
 * next (harder) one and go back to a fresh, unexecuted plan. */
export function startNextRound(d: PlanPlayGameData): void {
  if (d.dead) return;
  setUpRound(d);
}

/** Sets the planned lane for one segment. Works whether the round hasn't
 * started yet or is mid-execution (only un-executed segments matter —
 * editing a segment already passed is harmless, since it can never be
 * re-checked). This is what "Pause mid-run to revise the rest" is. */
export function setPlanLane(d: PlanPlayGameData, segIdx: number, lane: number): void {
  if (d.dead) return;
  if (segIdx < 0 || segIdx >= d.plan.length) return;
  if (lane < 0 || lane >= LANES) return;
  d.plan[segIdx] = lane;
}

export function stepGame(d: PlanPlayGameData, running: boolean): PlanPlayGameData {
  if (d.dead || !running) return d;
  if (d.execIndex >= d.roundLength) return d;

  d.execTick += 1;

  const blocked = blockedLanesFor(d, d.execIndex);
  if (blocked.includes(d.plan[d.execIndex])) {
    d.dead = true;
    return d;
  }

  if (d.execTick >= d.segmentTicks) {
    d.execTick = 0;
    d.execIndex += 1;
    d.score += 1;
  }

  return d;
}
