import { WORLDS } from "../src/content/index.ts";
import { describe, expect, it } from "vitest";
import { lastLessonOf, nextWorld, placedWorld, questionsFor, type WorldResult } from "../src/domain/placement.ts";
import { learnedUpTo, normalizeProgress, unlockedUpTo, isFreshLearner } from "../src/domain/progress.ts";

// Simulate a child who knows everything up to world `knows`.
function run(knows: number) {
  const results: WorldResult[] = [];
  let w = nextWorld(results), asked = 0;
  while (w != null) { results.push({ world: w, right: w <= knows ? 4 : 0 }); asked += 4; w = nextWorld(results); }
  return { placed: placedWorld(results), asked, tested: results.map(r => r.world) };
}

describe("placement check", () => {
  it("places every level exactly", () => {
    for (let k = 0; k <= WORLDS.length; k++) expect(run(k).placed).toBe(k);
  });
  it("is quick for beginners and never more than 52 questions", () => {
    expect(run(0).asked).toBe(4);
    expect(run(1).asked).toBe(8);
    for (let k = 0; k <= WORLDS.length; k++) expect(run(k).asked).toBeLessThanOrEqual(52);
  });
  it("checks the world in between after a missed jump", () => {
    expect(run(3).tested).toEqual([1, 2, 4, 3]);
    expect(run(5).tested).toEqual([1, 2, 4, 6, 5]);
  });
  it("needs 3 of 4 to pass a world (2 of 4 isn't enough)", () => {
    expect(placedWorld([{ world: 1, right: 3 }, { world: 2, right: 2 }])).toBe(1);
    expect(nextWorld([{ world: 1, right: 2 }])).toBeNull();
  });
  it("asks 4 questions, with whole sentences from world 3 on", () => {
    const q1 = questionsFor(1);
    expect(q1).toHaveLength(4);
    expect(q1.some(q => q.kind === "sentence")).toBe(false);
    for (const w of [3, 8, 14, 22]) {
      const qs = questionsFor(w);
      expect(qs).toHaveLength(4);
      expect(qs.map(q => q.kind)).toEqual(expect.arrayContaining(["recall", "sentence", "sentenceRecall"]));
      expect(qs.filter(q => q.sentence).length).toBe(2);
    }
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
