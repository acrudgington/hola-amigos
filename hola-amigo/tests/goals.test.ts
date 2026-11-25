import { describe, expect, it } from "vitest";
import { LESSONS, UNITS } from "../src/content/index.ts";
import { achievedGoals, allGoals, goalProgress, levelSummary, nextGoal } from "../src/domain/goals.ts";
import { normalizeProgress } from "../src/domain/progress.ts";

const fresh = () => normalizeProgress(null);
const know = (p: ReturnType<typeof fresh>, lessonIds: number[], box = 2) => {
  for (const id of lessonIds) for (const w of LESSONS.find(l => l.id === id)!.words) p.wordMemory[w.es] = { box, seen: 3, en: w.en, last: 1 };
};
const unit1 = UNITS[0];
const hello = unit1.goals.find(g => g.lessons.includes(1))!;

describe("I can… goals", () => {
  it("every lesson belongs to exactly one goal", () => {
    const ids = UNITS.flatMap(u => u.goals.flatMap(g => g.lessons)).sort((a, b) => a - b);
    expect(ids).toEqual(LESSONS.map(l => l.id));
  });

  it("starts at not started", () => {
    expect(goalProgress(fresh(), unit1, hello).state).toBe("not-started");
    expect(achievedGoals(fresh())).toEqual([]);
  });

  it("finishing the lessons alone is only 'practising'", () => {
    const p = fresh(); p.stars[1] = 3;
    const g = goalProgress(p, unit1, hello);
    expect(g.state).toBe("practising");
    expect(g.score).toBeLessThan(1);
  });

  it("is achieved when the lessons are done and most words are known", () => {
    const p = fresh(); p.stars[1] = 2; know(p, [1]);
    expect(goalProgress(p, unit1, hello).state).toBe("achieved");
  });

  it("knowing shared words from other lessons doesn't start a goal", () => {
    const p = fresh(); know(p, [1, 2, 3, 4, 5]);
    const zoo = UNITS.find(u => u.world === 10)!;
    expect(zoo.goals.map(g => goalProgress(p, zoo, g).state)).not.toContain("practising");
  });

  it("words seen only once don't count as known", () => {
    const p = fresh(); p.stars[1] = 3; know(p, [1], 1);
    expect(goalProgress(p, unit1, hello).state).toBe("practising");
  });

  it("summarises by level, counts A2 tasters separately, and suggests what's next", () => {
    const p = fresh(); p.stars[1] = 3; know(p, [1]); p.stars[2] = 1;
    const units = allGoals(p);
    const sum = levelSummary(units);
    expect(sum["pre-a1"].achieved).toBe(1);
    expect(sum["a2-taster"].total).toBeGreaterThan(0);
    expect(sum["a2"].total).toBeGreaterThan(0);
    expect(sum["pre-a1"].total + sum["a1"].total + sum["a2-taster"].total + sum["a2"].total).toBe(UNITS.reduce((n, u) => n + u.goals.length, 0));
    expect(nextGoal(units)?.goal.lessons).toContain(2);   // in progress beats not started
  });
});
