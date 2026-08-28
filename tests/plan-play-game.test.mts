import {
  createGame,
  stepGame,
  setPlanLane,
  startNextRound,
  blockedLanesFor,
  LANES,
  DIFFICULTY_CAP_SCORE,
  TWO_STREAM_SCORE,
  ROUND_LENGTH_MAX,
} from "../lib/plan-play-game.ts";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Picks any lane not currently blocked for a segment — the "correct read
 * of the frozen state" a careful player is meant to compute. */
function safeLaneFor(d: ReturnType<typeof createGame>, segIdx: number): number {
  const blocked = blockedLanesFor(d, segIdx);
  for (let lane = 0; lane < LANES; lane++) {
    if (!blocked.includes(lane)) return lane;
  }
  throw new Error("no safe lane found — should be impossible with <= 2 streams");
}

console.log("\n1. Nothing advances while paused");
{
  const d = createGame(seededRng(1));
  const execIndexBefore = d.execIndex;
  const execTickBefore = d.execTick;
  for (let i = 0; i < 500; i++) stepGame(d, false);
  check("execIndex unchanged while paused", d.execIndex === execIndexBefore);
  check("execTick unchanged while paused", d.execTick === execTickBefore);
}

console.log("\n2. A correctly-read plan clears a full round");
{
  const d = createGame(seededRng(2));
  for (let i = 0; i < d.roundLength; i++) setPlanLane(d, i, safeLaneFor(d, i));
  let ticks = 0;
  while (d.execIndex < d.roundLength && !d.dead && ticks < 10000) {
    stepGame(d, true);
    ticks++;
  }
  check("round clears without dying", !d.dead, `execIndex=${d.execIndex}/${d.roundLength}`);
  check("score equals the round length", d.score === d.roundLength, `score=${d.score}`);
}

console.log("\n3. Planning into a blocked lane is fatal");
{
  const d = createGame(seededRng(3));
  const blocked0 = blockedLanesFor(d, 0);
  setPlanLane(d, 0, blocked0[0]);
  let ticks = 0;
  while (!d.dead && ticks < 200) {
    stepGame(d, true);
    ticks++;
  }
  check("choosing a blocked lane kills the run", d.dead === true);
}

console.log("\n4. There is always at least one safe lane (<=2 streams, 3 lanes)");
{
  const rng = seededRng(4);
  let worstBlockedCount = 0;
  for (let trial = 0; trial < 200; trial++) {
    const d = createGame(rng);
    for (let i = 0; i < d.roundLength; i++) {
      worstBlockedCount = Math.max(worstBlockedCount, blockedLanesFor(d, i).length);
    }
  }
  check(
    "no round ever blocks every lane on any segment",
    worstBlockedCount < LANES,
    `worst=${worstBlockedCount}`
  );
}

console.log("\n5. Pause mid-round lets you revise only what's left");
{
  const d = createGame(seededRng(5));
  for (let i = 0; i < d.roundLength; i++) setPlanLane(d, i, safeLaneFor(d, i));
  // run the first segment for real, then "pause" (stop calling stepGame)
  let ticks = 0;
  while (d.execIndex === 0 && !d.dead && ticks < 10000) {
    stepGame(d, true);
    ticks++;
  }
  check("first segment executed", d.execIndex === 1, `execIndex=${d.execIndex}`);
  // now revise a later segment into a bad one while "paused" (no stepGame calls)
  const badLane = blockedLanesFor(d, 2)[0];
  setPlanLane(d, 2, badLane);
  check("editing an upcoming segment while paused doesn't move execIndex", d.execIndex === 1);
  // resume: should clear segment 1 fine, then die on the now-bad segment 2
  ticks = 0;
  while (!d.dead && d.execIndex < d.roundLength && ticks < 10000) {
    stepGame(d, true);
    ticks++;
  }
  check("the revised-into-danger segment is what kills the run", d.dead === true, `execIndex=${d.execIndex}`);
}

console.log("\n6. Editing an already-executed segment has no effect (can't rewrite history)");
{
  const d = createGame(seededRng(6));
  for (let i = 0; i < d.roundLength; i++) setPlanLane(d, i, safeLaneFor(d, i));
  let ticks = 0;
  while (d.execIndex < 2 && !d.dead && ticks < 10000) {
    stepGame(d, true);
    ticks++;
  }
  check("first two segments cleared", d.execIndex >= 2 && !d.dead);
  const badLane = blockedLanesFor(d, 0)[0];
  setPlanLane(d, 0, badLane); // segment 0 is long past
  check(
    "rewriting a passed segment doesn't retroactively kill the run",
    !d.dead
  );
}

console.log("\n7. Difficulty ramp — round length and speed both scale, then cap");
{
  const d1 = createGame(seededRng(7));
  d1.score = 0;
  const d2 = createGame(seededRng(7));
  d2.score = DIFFICULTY_CAP_SCORE;
  startNextRound(d2);
  startNextRound(d1);
  check("round length grows with score", d2.roundLength >= d1.roundLength, `${d1.roundLength} -> ${d2.roundLength}`);
  check("segment ticks shrink (faster) with score", d2.segmentTicks <= d1.segmentTicks, `${d1.segmentTicks} -> ${d2.segmentTicks}`);

  const d3 = createGame(seededRng(7));
  d3.score = DIFFICULTY_CAP_SCORE * 10;
  startNextRound(d3);
  check("round length is capped past the difficulty ceiling", d3.roundLength === d2.roundLength);
}

console.log("\n8. A second hazard stream only appears past the score threshold");
{
  const dLow = createGame(seededRng(8));
  dLow.score = TWO_STREAM_SCORE - 1;
  startNextRound(dLow);
  check("below threshold: exactly one stream", dLow.streams.length === 1, `streams=${dLow.streams.length}`);

  const dHigh = createGame(seededRng(8));
  dHigh.score = TWO_STREAM_SCORE;
  startNextRound(dHigh);
  check("at/above threshold: two streams", dHigh.streams.length === 2, `streams=${dHigh.streams.length}`);
}

console.log("\n9. Playability — a full-game bot clears many rounds by always reading the frozen state");
{
  const d = createGame(seededRng(9));
  let roundsCleared = 0;
  let guard = 0;
  while (!d.dead && roundsCleared < 15 && guard < 500) {
    for (let i = 0; i < d.roundLength; i++) setPlanLane(d, i, safeLaneFor(d, i));
    let ticks = 0;
    while (d.execIndex < d.roundLength && !d.dead && ticks < 10000) {
      stepGame(d, true);
      ticks++;
    }
    if (d.dead) break;
    roundsCleared++;
    startNextRound(d);
    guard++;
  }
  check(
    "a bot that always reads the frozen hazard state clears 15 rounds",
    roundsCleared >= 15,
    `roundsCleared=${roundsCleared} score=${d.score} dead=${d.dead}`
  );
}

console.log("\n10. A no-plan bot (always leaves the default middle lane) always dies fast");
{
  const rng = seededRng(10);
  let allTrialsDied = true;
  let worstSurvivedSegments = 0;
  for (let trial = 0; trial < 10; trial++) {
    const d = createGame(rng);
    let guard = 0;
    while (!d.dead && guard < 200) {
      // never touches setPlanLane — plan stays at the default (all lane 1)
      let ticks = 0;
      while (d.execIndex < d.roundLength && !d.dead && ticks < 10000) {
        stepGame(d, true);
        ticks++;
      }
      if (d.dead) break;
      startNextRound(d);
      guard++;
    }
    if (!d.dead) allTrialsDied = false;
    worstSurvivedSegments = Math.max(worstSurvivedSegments, d.score);
  }
  check(
    "leaving every segment on the default lane always gets caught by a rotating hazard",
    allTrialsDied,
    `worstScore=${worstSurvivedSegments}`
  );
  check(
    "and it happens fast — within the first round's handful of segments",
    worstSurvivedSegments <= ROUND_LENGTH_MAX,
    `worstScore=${worstSurvivedSegments}`
  );
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}\n`);
process.exit(failures === 0 ? 0 : 1);
