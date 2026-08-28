import {
  createGame,
  stepGame,
  tryJump,
  plant,
  isSolidAt,
  pitWidthFor,
  JUMP_RANGE,
  MAX_PIT_W,
  MIN_PIT_W,
  PLAYER_X,
  H,
} from "../lib/split-self-game.ts";

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

console.log("\n1. Basic run and gravity");
{
  const d = createGame(seededRng(1));
  check("starts grounded", d.grounded === true);
  const y0 = d.playerY;
  tryJump(d);
  stepGame(d, true);
  check("jumping leaves the ground", d.playerY < y0, `y=${d.playerY}`);
  check("scroll advances while running", d.scrollX > 0);
}

console.log("\n2. Pause plants a solid tile exactly under the player");
{
  const d = createGame(seededRng(2));
  for (let i = 0; i < 10; i++) stepGame(d, true);
  const worldXAtPlant = d.scrollX + PLAYER_X;
  plant(d);
  check("planting grounds the player", d.grounded === true && d.playerY === 118);
  check("planted tile covers the player's world position", isSolidAt(d, worldXAtPlant));
  check("exactly one platform was added", d.platforms.length === 1);
}

console.log("\n3. Pause freezes the world, not just the player");
{
  const d = createGame(seededRng(3));
  for (let i = 0; i < 5; i++) stepGame(d, true);
  const scrollBefore = d.scrollX;
  for (let i = 0; i < 200; i++) stepGame(d, false); // "paused" — running=false
  check("scroll does not advance while paused", d.scrollX === scrollBefore);
}

console.log("\n4. A pit within jump range needs no pause at all");
{
  const d = createGame(seededRng(4));
  // force a single easy pit right at the start
  d.pits = [{ x: d.scrollX + PLAYER_X + 20, w: MIN_PIT_W, scored: false }];
  d.nextPitAt = 100000; // stop auto-spawning from interfering
  let jumped = false;
  let ticks = 0;
  while (d.pits[0] && !d.pits[0].scored && !d.dead && ticks < 500) {
    if (d.grounded && !isSolidAt(d, d.scrollX + PLAYER_X + 2) && !jumped) {
      tryJump(d);
      jumped = true;
    }
    stepGame(d, true);
    ticks++;
  }
  check(
    "a single normal jump clears a pit at MIN_PIT_W without pausing",
    d.pits[0]?.scored === true && !d.dead,
    `scored=${d.pits[0]?.scored} dead=${d.dead}`
  );
  check("MIN_PIT_W is comfortably within JUMP_RANGE", MIN_PIT_W < JUMP_RANGE);
}

console.log("\n5. A pit wider than JUMP_RANGE is impossible without pausing");
{
  const d = createGame(seededRng(5));
  d.pits = [{ x: d.scrollX + PLAYER_X + 20, w: MAX_PIT_W, scored: false }];
  d.nextPitAt = 100000;
  let jumped = false;
  let ticks = 0;
  while (!d.dead && ticks < 500 && !(d.pits[0] && d.pits[0].scored)) {
    if (d.grounded && !isSolidAt(d, d.scrollX + PLAYER_X + 2) && !jumped) {
      tryJump(d);
      jumped = true;
    }
    stepGame(d, true);
    ticks++;
  }
  check("MAX_PIT_W exceeds a single JUMP_RANGE", MAX_PIT_W > JUMP_RANGE, `range=${JUMP_RANGE}`);
  check(
    "a bot that only jumps, never pauses, dies on a MAX_PIT_W pit",
    d.dead === true,
    `dead=${d.dead} score=${d.score}`
  );
}

console.log("\n6. Playability — a pause-assisted bot clears MAX_PIT_W by splitting it");
{
  const d = createGame(seededRng(6));
  d.pits = [{ x: d.scrollX + PLAYER_X + 20, w: MAX_PIT_W, scored: false }];
  d.nextPitAt = 100000;
  let phase: "approach" | "airborne" | "onPlatform" | "done" = "approach";
  let ticks = 0;
  while (!d.dead && ticks < 1000 && phase !== "done") {
    const worldX = d.scrollX + PLAYER_X;
    const pit = d.pits[0];
    if (phase === "approach") {
      if (d.grounded && worldX + 2 >= pit.x) {
        tryJump(d);
        phase = "airborne";
      }
    } else if (phase === "airborne") {
      const remaining = pit.x + pit.w - worldX;
      if (remaining <= JUMP_RANGE - 5) {
        plant(d);
        phase = "onPlatform";
      }
    } else if (phase === "onPlatform") {
      if (d.grounded) {
        tryJump(d);
        phase = "done";
      }
    }
    stepGame(d, true);
    ticks++;
  }
  // let the second jump land
  for (let i = 0; i < 60 && !d.dead; i++) stepGame(d, true);
  check(
    "pause-assisted bot survives and scores the split pit",
    !d.dead && d.score >= 1,
    `dead=${d.dead} score=${d.score} platforms=${d.platforms.length}`
  );
}

console.log("\n7. Full run — pause-assisted bot survives many increasingly hard pits");
{
  // General-purpose strategy: jump at the edge of whatever pit is ahead;
  // while airborne over it, plant the moment the remaining distance first
  // drops to a safely-clearable range, then jump again once grounded.
  const d = createGame(seededRng(7));
  let ticks = 0;
  while (!d.dead && d.score < 25 && ticks < 30000) {
    const worldX = d.scrollX + PLAYER_X;
    const nextPit = d.pits.find((p) => !p.scored && p.x + p.w > worldX);
    if (nextPit) {
      const overPit = worldX >= nextPit.x && worldX <= nextPit.x + nextPit.w;
      const remaining = nextPit.x + nextPit.w - worldX;
      if (d.grounded && worldX + 2 >= nextPit.x && worldX < nextPit.x + nextPit.w) {
        tryJump(d);
      } else if (!d.grounded && overPit && remaining <= JUMP_RANGE - 5) {
        plant(d);
      }
    }
    stepGame(d, true);
    ticks++;
  }
  check(
    "pause-assisted bot chains 25 pits across a full ramping run",
    d.score >= 25,
    `score=${d.score} dead=${d.dead} ticks=${ticks}`
  );
}

console.log("\n8. Pit width curve stays within the solvable window");
{
  const rng = seededRng(8);
  let maxSeen = 0;
  let minSeen = Infinity;
  for (let i = 0; i < 60; i++) {
    const w = pitWidthFor(i, rng);
    maxSeen = Math.max(maxSeen, w);
    minSeen = Math.min(minSeen, w);
  }
  check("pit widths never exceed MAX_PIT_W", maxSeen <= MAX_PIT_W + 0.01, `max=${maxSeen}`);
  check("pit widths never drop below MIN_PIT_W", minSeen >= MIN_PIT_W - 0.01, `min=${minSeen}`);
  check(
    "the hardest pits still leave a real timing window to split",
    2 * JUMP_RANGE - MAX_PIT_W > 10,
    `window=${2 * JUMP_RANGE - MAX_PIT_W}`
  );
}

console.log("\n9. Falling into an unspanned pit is fatal");
{
  const d = createGame(seededRng(9));
  d.pits = [{ x: d.scrollX + PLAYER_X + 5, w: MIN_PIT_W, scored: false }];
  d.nextPitAt = 100000;
  let ticks = 0;
  while (!d.dead && ticks < 500) {
    stepGame(d, true); // never jump
    ticks++;
  }
  check("walking straight into a pit with no jump ends the game", d.dead === true);
  check("death happens once the player falls past the canvas", d.playerY > H - 0.01);
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}\n`);
process.exit(failures === 0 ? 0 : 1);
