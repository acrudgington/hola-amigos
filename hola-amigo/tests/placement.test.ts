import { describe, expect, it } from "vitest";
import { lastLessonOf, nextWorld, placedWorld, questionsFor, type WorldResult } from "../src/domain/placement.ts";
import { learnedUpTo, normalizeProgress, unlockedUpTo, isFreshLearner } from "../src/domain/progress.ts";

// Simulate a child who knows everything up to world `knows`.
function run(knows: number) {
  const results: WorldResult[] = [];
  let w = nextWorld(results), asked = 0;
  while (w != null) { results.push({ world: w, right: w <= knows ? 3 : 0 }); asked += 3; w = nextWorld(results); }
  return { placed: placedWorld(results), asked, tested: results.map(r => r.world) };
}

describe("placement check", () => {
  it("places every level exactly", () => {
    for (let k = 0; k <= 12; k++) expect(run(k).placed).toBe(k);
  });
  it("is quick for beginners and never more than 24 questions", () => {
    expect(run(0).asked).toBe(3);
    expect(run(1).asked).toBe(6);
    for (let k = 0; k <= 12; k++) expect(run(k).asked).toBeLessThanOrEqual(24);
  });
  it("checks the world in between after a missed jump", () => {
    expect(run(3).tested).toEqual([1, 2, 4, 3]);
    expect(run(5).tested).toEqual([1, 2, 4, 6, 5]);
  });
  it("needs 2 of 3 to pass a world", () => {
    expect(placedWorld([{ world: 1, right: 2 }, { world: 2, right: 1 }])).toBe(1);
    expect(nextWorld([{ world: 1, right: 1 }])).toBeNull();
  });
  it("asks 3 questions spread across the world, with recall from world 3", () => {
    const q1 = questionsFor(1);
    expect(q1).toHaveLength(3);
    expect(q1.some(q => q.kind === "recall")).toBe(false);
    expect(questionsFor(5).map(q => q.kind)).toContain("recall");
    expect(questionsFor(5, { canListen: false }).some(q => q.kind === "listen")).toBe(false);
  });
});

describe("unlocking after placement", () => {
  it("unlocks up to the placed world without needing stars", () => {
    const p = normalizeProgress(null);
    expect(isFreshLearner(p)).toBe(true);
    p.placedUpTo = lastLessonOf(4);
    expect(learnedUpTo(p)).toBe(32);
    expect(unlockedUpTo(p, 100)).toBe(33);
    p.stars = { 40: 2 };
    expect(unlockedUpTo(p, 100)).toBe(41);
  });
});
