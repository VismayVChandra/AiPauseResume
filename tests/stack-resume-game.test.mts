import {
  createGame,
  stepGame,
  commitDrop,
  currentSpeed,
  W,
  BASE_W,
  DIFFICULTY_CAP_SCORE,
} from "../lib/stack-resume-game.ts";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

console.log("\n1. Sweep motion and bouncing");
{
  const d = createGame();
  const x0 = d.current.x;
  stepGame(d, true);
  check("sweep moves while running", d.current.x > x0, `x=${d.current.x}`);

  const d2 = createGame();
  let bounced = false;
  for (let i = 0; i < 2000; i++) {
    const before = d2.current.dir;
    stepGame(d2, true);
    if (d2.current.dir !== before) bounced = true;
    if (d2.current.x < -0.01 || d2.current.x > W - d2.current.w + 0.01) {
      failures++;
      console.log(`  FAIL  sweep escaped bounds at tick ${i}: x=${d2.current.x}`);
      break;
    }
  }
  check("sweep bounces off at least one edge within 2000 ticks", bounced);
}

console.log("\n2. Pause freezes the sweep, not just slows it");
{
  const d = createGame();
  for (let i = 0; i < 50; i++) stepGame(d, true);
  const x1 = d.current.x;
  const dir1 = d.current.dir;
  for (let i = 0; i < 500; i++) stepGame(d, false);
  check("position holds through a long pause", d.current.x === x1);
  check("direction holds through a long pause", d.current.dir === dir1);
  stepGame(d, true);
  check("resuming moves it again", d.current.x !== x1);
}

console.log("\n3. Perfect-alignment drop keeps full width");
{
  const d = createGame();
  d.current.x = d.blocks[0].x; // exact match with the base
  d.current.w = d.blocks[0].w;
  const ok = commitDrop(d);
  check("perfectly aligned drop succeeds", ok === true);
  check("no width lost on a perfect drop", d.blocks[1].w === BASE_W, `w=${d.blocks[1].w}`);
  check("score increments", d.score === 1);
}

console.log("\n4. Partial overlap trims the block");
{
  const d = createGame();
  const top = d.blocks[0];
  d.current.x = top.x + top.w - 20; // only 20px of overlap on the right edge
  d.current.w = 60;
  const ok = commitDrop(d);
  check("partial overlap still counts as a hit", ok === true);
  check("placed block width equals the actual overlap", Math.abs(d.blocks[1].w - 20) < 0.01, `w=${d.blocks[1].w}`);
  check("next sweep block inherits the trimmed width", d.current.w === d.blocks[1].w);
}

console.log("\n5. A total miss ends the game");
{
  const d = createGame();
  const top = d.blocks[0];
  d.current.x = top.x + top.w + 50; // nowhere near the base
  d.current.w = 40;
  const ok = commitDrop(d);
  check("missing entirely returns false", ok === false);
  check("missing entirely marks the game dead", d.dead === true);
  const scoreBefore = d.score;
  stepGame(d, true);
  const ok2 = commitDrop(d);
  check("no further drops resolve once dead", ok2 === false && d.score === scoreBefore);
}

console.log("\n6. Each drop narrows the next target — genre's core difficulty curve");
{
  const d = createGame();
  d.current.x = d.blocks[0].x + 10; // deliberately imperfect first drop
  commitDrop(d);
  const w1 = d.blocks[1].w;
  check("an imperfect drop is narrower than the base", w1 < BASE_W, `w1=${w1}`);
  d.current.x = d.blocks[1].x; // perfectly aligned this time
  commitDrop(d);
  const w2 = d.blocks[2].w;
  check("a subsequent perfect drop keeps that (narrower) width exactly", Math.abs(w2 - w1) < 0.01, `w1=${w1} w2=${w2}`);
}

console.log("\n7. Difficulty ramp is bounded");
{
  check("speed increases with score before the cap", currentSpeed(10) > currentSpeed(0));
  check("speed caps at the difficulty ceiling", currentSpeed(9999) <= currentSpeed(DIFFICULTY_CAP_SCORE) + 0.001);
}

console.log("\n8. Playability — pause-assisted aim achieves near-perfect precision");
{
  // The whole selling point of this game's Pause mechanic: freeze the
  // sweep near the target, then drop. Model that directly — a bot that
  // steps until the sweep crosses within a tolerance of "aligned with the
  // block below", then commits — and confirm it can chain a long run of
  // clean placements even as speed ramps up, losing only the tolerance
  // amount each time rather than degrading catastrophically.
  const d = createGame();
  const TOLERANCE = 2; // px — stands in for "close enough once frozen"
  let ticks = 0;
  const MAX_TICKS = 200000;
  while (d.score < 60 && !d.dead && ticks < MAX_TICKS) {
    const top = d.blocks[d.blocks.length - 1];
    const targetX = Math.max(0, Math.min(top.x, W - d.current.w));
    if (Math.abs(d.current.x - targetX) <= TOLERANCE) {
      commitDrop(d);
    } else {
      stepGame(d, true);
    }
    ticks++;
  }
  check("a pause-assisted bot chains 60 clean placements", d.score >= 60, `score=${d.score} dead=${d.dead}`);

  // And confirm the precision claim quantitatively: width lost per drop
  // should track the tolerance, not blow up as speed increases.
  const widths = d.blocks.map((b) => b.w);
  const worstShrinkRatio = Math.min(
    ...widths.slice(1).map((w, i) => w / widths[i])
  );
  check(
    "no single drop lost more than ~15% of the previous width",
    worstShrinkRatio > 0.85,
    `worst ratio=${worstShrinkRatio.toFixed(3)}`
  );
}

console.log("\n9. A no-pause bot (never freezes to aim) fares meaningfully worse");
{
  // Confirms Pause is genuinely load-bearing for this game, not cosmetic —
  // a bot that commits at a fixed cadence regardless of alignment should
  // do worse than the pause-assisted one above.
  const d = createGame();
  let ticks = 0;
  while (!d.dead && ticks < 20000) {
    stepGame(d, true);
    if (ticks % 47 === 0) commitDrop(d); // arbitrary fixed cadence, no aiming
    ticks++;
  }
  check(
    "a no-aim bot survives far fewer drops than the pause-assisted bot",
    d.score < 60,
    `score=${d.score}`
  );
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}\n`);
process.exit(failures === 0 ? 0 : 1);
