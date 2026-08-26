import {
  createGame,
  stepGame,
  tryJump,
  collides,
  isGrounded,
  displayScore,
  maxJumpHeight,
  measuredJumpPeak,
  jumpAirtimeFrames,
  GROUND_Y,
  FLOOR_Y,
  PLAYER_X,
  PLAYER_W,
  PLAYER_H,
  BASE_SPEED,
  MAX_SPEED_BONUS,
  W,
} from "../lib/runner-game.ts";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

console.log("\n1. Physics");
{
  const d = createGame();
  check("starts grounded", isGrounded(d));
  tryJump(d);
  check("jump sets upward velocity", d.vy < 0);
  let minY = d.y;
  for (let i = 0; i < 200; i++) {
    stepGame(d, () => 0.5);
    minY = Math.min(minY, d.y);
  }
  check("comes back down to the floor", Math.abs(d.y - FLOOR_Y) < 0.01, `y=${d.y}`);
  const peak = FLOOR_Y - minY;
  check("discrete jump peak matches measuredJumpPeak()", Math.abs(peak - measuredJumpPeak()) < 0.01, `peak=${peak.toFixed(1)} measured=${measuredJumpPeak().toFixed(1)}`);
}

console.log("\n2. No mid-air double jump");
{
  const d = createGame();
  check("first jump allowed", tryJump(d) === true);
  stepGame(d, () => 0.5);
  check("second jump refused while airborne", tryJump(d) === false);
}

console.log("\n3. Obstacles spawn and travel left");
{
  const d = createGame();
  for (let i = 0; i < 70; i++) stepGame(d, () => 0.5);
  check("at least one obstacle spawned", d.obstacles.length >= 1, `count=${d.obstacles.length}`);
  const x1 = d.obstacles[0].x;
  stepGame(d, () => 0.5);
  check("obstacle moves leftward", d.obstacles[0].x < x1);
}

console.log("\n4. Collision");
{
  const d = createGame();
  d.obstacles = [{ x: PLAYER_X, w: 20, h: 40 }];
  check("overlapping obstacle collides", collides(d) === true);

  const d2 = createGame();
  d2.obstacles = [{ x: PLAYER_X + 400, w: 20, h: 40 }];
  check("distant obstacle does not collide", collides(d2) === false);

  const d3 = createGame();
  d3.y = FLOOR_Y - measuredJumpPeak(); // at the REAL discrete peak
  d3.obstacles = [{ x: PLAYER_X, w: 20, h: 42 }]; // tallest obstacle
  check("clears tallest obstacle at jump peak", collides(d3) === false, `playerBottom=${(d3.y + PLAYER_H).toFixed(1)} obstacleTop=${GROUND_Y - 42}`);
}

console.log("\n5. Score and speed ramp");
{
  const d = createGame();
  for (let i = 0; i < 300; i++) { d.obstacles = []; stepGame(d, () => 0.5); }
  check("score increases", displayScore(d) > 0, `score=${displayScore(d)}`);
  check("speed ramps above base", d.speed > BASE_SPEED, `speed=${d.speed.toFixed(2)}`);
  const d2 = createGame();
  for (let i = 0; i < 20000; i++) { d2.obstacles = []; stepGame(d2, () => 0.5); }
  check("speed is capped", d2.speed <= BASE_SPEED + MAX_SPEED_BONUS + 0.001, `speed=${d2.speed.toFixed(2)}`);
}

console.log("\n6. Playability — can a perfect player survive at max speed?");
{
  // Worst case: rand()=0 gives the tightest spawn gaps the game can produce.
  const d = createGame();
  d.ticks = 20000; // start already at max speed
  d.speed = BASE_SPEED + MAX_SPEED_BONUS;
  let survived = 0;
  for (let i = 0; i < 6000; i++) {
    // Simple bot: jump when the nearest obstacle ahead is within reach.
    const ahead = d.obstacles
      .filter((o) => o.x + o.w > PLAYER_X)
      .sort((a, b) => a.x - b.x)[0];
    if (ahead) {
      const gap = ahead.x - (PLAYER_X + PLAYER_W);
      const framesToReach = gap / d.speed;
      if (isGrounded(d) && framesToReach <= jumpAirtimeFrames() / 2) tryJump(d);
    }
    stepGame(d, () => 0);
    if (d.dead) break;
    survived++;
  }
  check("a competent player survives 6000 frames at max speed on tightest spawns", !d.dead, `died at frame ${survived}`);

  // And confirm two obstacles never spawn closer than one jump can clear.
  const d2 = createGame();
  d2.ticks = 20000;
  d2.speed = BASE_SPEED + MAX_SPEED_BONUS;
  let minGapPx = Infinity;
  let prevX: number | null = null;
  for (let i = 0; i < 8000; i++) {
    const before = d2.obstacles.length;
    d2.obstacles = d2.obstacles.filter(() => true);
    stepGame(d2, () => 0);
    d2.dead = false; // ignore collisions, we only want spawn geometry
    if (d2.obstacles.length > before) {
      const spawned = d2.obstacles[d2.obstacles.length - 1];
      if (prevX !== null) minGapPx = Math.min(minGapPx, spawned.x - prevX);
      prevX = spawned.x;
    }
    if (prevX !== null) prevX -= d2.speed;
  }
  const jumpReach = jumpAirtimeFrames() * (BASE_SPEED + MAX_SPEED_BONUS);
  check("min obstacle spacing exceeds a single jump's reach", minGapPx > jumpReach * 0.6, `minGap=${minGapPx.toFixed(0)}px jumpReach=${jumpReach.toFixed(0)}px`);
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}\n`);
process.exit(failures === 0 ? 0 : 1);
