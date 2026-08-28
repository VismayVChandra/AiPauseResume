import {
  createGame,
  stepGame,
  gapCenter,
  currentFreq,
  currentScroll,
  STAMINA_MAX,
  STAMINA_DRAIN,
  DIFFICULTY_CAP_SCORE,
  GATE_GAP_H,
  GATE_BASELINE,
  GATE_AMP,
  H,
  PLAYER_X,
} from "../lib/hold-resume-game.ts";

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

console.log("\n1. Holding advances the world and drifts the player toward the target");
{
  const d = createGame(seededRng(1));
  const x0 = d.gates[0].x;
  const y0 = d.playerY;
  stepGame(d, true, H - 10);
  check("gates scroll while held", d.gates[0].x < x0, `x=${d.gates[0].x}`);
  check("player drifts toward the drag target while held", d.playerY > y0, `y=${d.playerY}`);
}

console.log("\n2. Releasing freezes everything, including the player");
{
  const d = createGame(seededRng(2));
  for (let i = 0; i < 20; i++) stepGame(d, true, H - 10);
  const xBefore = d.gates[0].x;
  const yBefore = d.playerY;
  const staminaAfterHold = d.stamina;
  for (let i = 0; i < 100; i++) stepGame(d, false, 0); // released — target is irrelevant now
  check("gate position holds through a release", d.gates[0].x === xBefore, `x=${d.gates[0].x}`);
  check(
    "player position holds through a release even with a very different target",
    d.playerY === yBefore,
    `y=${d.playerY}`
  );
  check("stamina recovers while released", d.stamina > staminaAfterHold);
}

console.log("\n3. Stamina drains while held and only recovers on release");
{
  const d = createGame(seededRng(3));
  // push gates far out of reach so this section tests stamina in isolation,
  // without a gate collision interfering (the spawn loop only adds more
  // once the last gate gets within W+200, so this also stops new ones)
  for (const g of d.gates) g.x = 999999;
  let ticks = 0;
  while (d.stamina > 0 && ticks < 1000) {
    stepGame(d, true, d.playerY); // hold in place, just burning stamina
    ticks++;
  }
  check("continuous holding empties the stamina meter", d.stamina === 0, `stamina=${d.stamina}`);
  const gateXAtEmpty = d.gates[0].x;
  for (let i = 0; i < 30; i++) stepGame(d, true, d.playerY); // still held, but empty
  check("holding with empty stamina freezes the world too (no drain, no motion)", d.gates[0].x === gateXAtEmpty);
  check("stamina does not go negative", d.stamina === 0);
  stepGame(d, false, 0);
  check("releasing starts recovery again", d.stamina > 0);
}

// The stamina budget (150 held ticks) is shorter than the distance to the
// first gate at base scroll speed, by design — even reaching gate one
// requires at least one release-to-recover cycle. So every bot below
// bursts (releases once stamina runs low) rather than holding forever;
// section 9 already covers what happens if you never release at all.
function burstHold(stamina: number): boolean {
  return stamina > 15;
}

console.log("\n4. Flying through a gate at the wrong height is fatal");
{
  const d = createGame(seededRng(4));
  let ticks = 0;
  while (!d.dead && ticks < 30000) {
    stepGame(d, burstHold(d.stamina), 10); // burst to make progress, but never aim for the gap
    ticks++;
  }
  check("ignoring the gap eventually kills the run", d.dead === true, `ticks=${ticks} score=${d.score}`);
}

console.log("\n5. Steering into the gap at the right moment survives it");
{
  const d = createGame(seededRng(5));
  let ticks = 0;
  while (!d.dead && d.score < 1 && ticks < 30000) {
    const freq = currentFreq(d.score);
    const g = d.gates.find((gt) => !gt.passed)!;
    const target = gapCenter(g, d.gateClock + 1, freq);
    stepGame(d, burstHold(d.stamina), target);
    ticks++;
  }
  check("aiming at the live gap center clears at least one gate", d.score >= 1, `score=${d.score} dead=${d.dead}`);
}

console.log("\n6. Difficulty ramp is bounded");
{
  check("scroll speed increases with score before the cap", currentScroll(10) > currentScroll(0));
  check("scroll speed caps out", currentScroll(9999) <= currentScroll(DIFFICULTY_CAP_SCORE) + 0.001);
  check("gate frequency caps out", currentFreq(9999) <= currentFreq(DIFFICULTY_CAP_SCORE) + 0.001);
}

console.log("\n7. Gap stays within a reachable band");
{
  check("gap's highest point never exceeds the top of the canvas", GATE_BASELINE - GATE_AMP - GATE_GAP_H / 2 > 0);
  check("gap's lowest point never exceeds the bottom of the canvas", GATE_BASELINE + GATE_AMP + GATE_GAP_H / 2 < H);
}

console.log("\n8. Playability — a burst-and-aim bot clears many gates");
{
  const d = createGame(seededRng(8));
  let ticks = 0;
  while (!d.dead && d.score < 20 && ticks < 60000) {
    const freq = currentFreq(d.score);
    const nextGate = d.gates.find((gt) => !gt.passed);
    const held = d.stamina > 15; // burst: hold while there's a real margin, release to recover otherwise
    if (nextGate) {
      const target = gapCenter(nextGate, d.gateClock + 1, freq);
      stepGame(d, held, target);
    } else {
      stepGame(d, held, d.playerY);
    }
    ticks++;
  }
  check(
    "a bot that bursts (holds with margin, releases to recover) clears 20 gates",
    d.score >= 20,
    `score=${d.score} dead=${d.dead} ticks=${ticks}`
  );
}

console.log("\n9. Never releasing gets you stuck, even with perfect aim — bursting is mandatory");
{
  // Same quality of aim as the section 5/8 bots — always steers at the
  // live gap center — but never releases. Should still plateau once
  // stamina runs out, proving good aim alone can't substitute for
  // actually bursting.
  const d = createGame(seededRng(9));
  let ticks = 0;
  const scores: number[] = [];
  while (ticks < 4000) {
    const freq = currentFreq(d.score);
    const nextGate = d.gates.find((gt) => !gt.passed);
    const target = nextGate ? gapCenter(nextGate, d.gateClock + 1, freq) : d.playerY;
    stepGame(d, true, target); // always held, never released
    ticks++;
    if (ticks % 400 === 0) scores.push(d.score);
  }
  const laterScores = scores.slice(-3);
  const plateaued = laterScores.every((s) => s === laterScores[0]);
  check(
    "even with perfect aim, score plateaus once stamina bottoms out from never releasing",
    plateaued,
    `scores over time=${scores.join(",")}`
  );
  check(
    "a bursting bot (section 8) clears meaningfully more gates than a hold-forever bot",
    laterScores[0] < 20,
    `neverReleaseScore=${laterScores[0]}`
  );
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}\n`);
process.exit(failures === 0 ? 0 : 1);
