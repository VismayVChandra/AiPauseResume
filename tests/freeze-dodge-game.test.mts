import {
  createGame,
  stepGame,
  gapCenter,
  isSafeY,
  currentScroll,
  currentFreq,
  PLAYER_X,
  PLAYER_SIZE,
  GATE_W,
  H,
  PAD,
} from "../lib/freeze-dodge-game.ts";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

console.log("\n1. Player steering and bounds");
{
  const d = createGame();
  const y0 = d.playerY;
  stepGame(d, { up: true, down: false, running: true });
  check("holding up moves the player up", d.playerY < y0);

  const d2 = createGame();
  for (let i = 0; i < 500; i++) stepGame(d2, { up: true, down: false, running: true });
  check("player never leaves the top bound", d2.playerY >= PAD + PLAYER_SIZE / 2 - 0.01, `y=${d2.playerY}`);

  const d3 = createGame();
  for (let i = 0; i < 500; i++) stepGame(d3, { up: false, down: true, running: true });
  check("player never leaves the bottom bound", d3.playerY <= H - PAD - PLAYER_SIZE / 2 + 0.01, `y=${d3.playerY}`);
}

console.log("\n2. Pause freezes the world, not the player");
{
  const d = createGame();
  const gx0 = d.gates[0].x;
  const clock0 = d.gateClock;
  for (let i = 0; i < 30; i++) stepGame(d, { up: false, down: false, running: false });
  check("gates don't move while paused", d.gates[0].x === gx0, `moved to ${d.gates[0].x}`);
  check("gate clock doesn't advance while paused", d.gateClock === clock0);

  const y0 = d.playerY;
  stepGame(d, { up: true, down: false, running: false });
  check("player can still steer while paused", d.playerY < y0);
}

console.log("\n3. Resuming continues gate motion from the frozen point");
{
  const d = createGame();
  for (let i = 0; i < 40; i++) stepGame(d, { up: false, down: false, running: true });
  const xBeforePause = d.gates[0].x;
  for (let i = 0; i < 200; i++) stepGame(d, { up: false, down: false, running: false });
  check("position holds through a long pause", d.gates[0].x === xBeforePause);
  stepGame(d, { up: false, down: false, running: true });
  check("resuming moves the gate again", d.gates[0].x < xBeforePause);
}

console.log("\n4. Gap geometry and safety check");
{
  const d = createGame();
  const gate = d.gates[0];
  const freq = currentFreq(0);
  const c = gapCenter(gate, 0, freq);
  check("dead centre of the gap is safe", isSafeY(c, gate, 0, freq) === true);
  check("far above the gap is unsafe", isSafeY(c - 200, gate, 0, freq) === false);
  check("far below the gap is unsafe", isSafeY(c + 200, gate, 0, freq) === false);
}

console.log("\n5. Collision at an unsafe crossing");
{
  const d = createGame();
  const gate = d.gates[0];
  gate.x = PLAYER_X; // force immediate overlap
  const freq = currentFreq(d.score);
  const unsafe = gapCenter(gate, d.gateClock, freq) + 1000; // guaranteed outside the gap
  d.playerY = Math.min(Math.max(unsafe, PAD), H - PAD);
  stepGame(d, { up: false, down: false, running: false }); // even paused, self-inflicted collision counts
  check("steering into a wall still kills you, paused or not", d.dead === true);
}

console.log("\n6. Scoring");
{
  const d = createGame();
  let ticks = 0;
  const startScore = d.score;
  while (d.score === startScore && ticks < 5000 && !d.dead) {
    // Bot: chase the nearest gate's gap centre every frame, no pausing.
    const freq = currentFreq(d.score);
    const ahead = d.gates
      .filter((g) => g.x + GATE_W > PLAYER_X)
      .sort((a, b) => a.x - b.x)[0];
    const target = ahead ? gapCenter(ahead, d.gateClock, freq) : H / 2;
    stepGame(d, { up: d.playerY > target + 1, down: d.playerY < target - 1, running: true });
    ticks++;
  }
  check("score increments on passing a gate", d.score === startScore + 1, `score=${d.score} dead=${d.dead}`);
}

console.log("\n7. Difficulty ramp is bounded");
{
  check("scroll speed caps out", currentScroll(10000) <= currentScroll(40) + 0.001);
  check("frequency caps out", currentFreq(10000) <= currentFreq(40) + 0.001);
  check("scroll increases with score before the cap", currentScroll(20) > currentScroll(0));
}

console.log("\n8. Playability — a no-pause bot survives increasing difficulty");
{
  // The whole point of this game is that Pause is a helper, not a
  // requirement — so a bot that never pauses should still be able to
  // survive for a long, meaningful stretch on ordinary (non-adversarial)
  // gate phases, proving the base numbers (gap size vs player size vs
  // oscillation speed vs scroll speed) are fair even without the crutch.
  const d = createGame();
  let frame = 0;
  const MAX_FRAMES = 20000; // ~330s at 60fps — well past the difficulty cap at 40 gates
  for (; frame < MAX_FRAMES; frame++) {
    const freq = currentFreq(d.score);
    const ahead = d.gates
      .filter((g) => g.x + GATE_W > PLAYER_X - PLAYER_SIZE)
      .sort((a, b) => a.x - b.x)[0];
    const target = ahead ? gapCenter(ahead, d.gateClock, freq) : H / 2;
    stepGame(d, { up: d.playerY > target + 1, down: d.playerY < target - 1, running: true });
    if (d.dead) break;
  }
  check(
    "a chase-the-gap bot with no pausing survives 20000 frames",
    !d.dead,
    `died at frame ${frame}, score ${d.score}`
  );
  check("that run passed a meaningful number of gates", d.score > 30, `score=${d.score}`);
}

console.log("\n9. Gap never drifts outside the playable band");
{
  // If GATE_BASELINE/GATE_AMP were tuned wrong, the gap could swing past
  // the canvas edge, making some phases of the oscillation literally
  // impossible to reach — check across a full period at max difficulty.
  const d = createGame();
  const freq = currentFreq(9999);
  let minC = Infinity;
  let maxC = -Infinity;
  const period = (2 * Math.PI) / freq;
  for (let t = 0; t < period; t += 1) {
    const c = gapCenter(d.gates[0], t, freq);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  }
  check(
    "gap centre stays within a reachable band across a full oscillation",
    minC > PAD + 10 && maxC < H - PAD - 10,
    `min=${minC.toFixed(1)} max=${maxC.toFixed(1)}`
  );
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}\n`);
process.exit(failures === 0 ? 0 : 1);
