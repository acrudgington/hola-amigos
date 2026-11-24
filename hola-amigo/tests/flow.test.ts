import { describe, expect, test } from "vitest";
import { initialNav, isLastStep, navReducer, type NavState } from "../src/state/nav.ts";
import { applyChange } from "../src/state/useProgress.ts";
import { planMission } from "../src/lib/mission.ts";
import { addXP, logEvent, normalizeProgress, recordWord, xpForLevel } from "../src/domain/progress.ts";

const start = (): NavState => navReducer(initialNav(true), { type: "startLesson", lessonId: 3, steps: ["learn", "quiz", "story"], run: 1 });

describe("lesson flow state machine", () => {
  test("starting a lesson opens its first activity", () => {
    const s = start();
    expect(s.view).toBe("activity");
    expect(s.lessonId).toBe(3);
    expect(s.activity).toEqual({ type: "learn", run: 1 });
    expect(s.journey).toMatchObject({ step: 0, correct: 0, total: 0 });
  });

  test("finishing activities walks through the steps and adds up the score", () => {
    let s = start();
    s = navReducer(s, { type: "activityFinished", correct: 0, total: 0, run: 2 });
    expect(s.activity).toEqual({ type: "quiz", run: 2 });
    s = navReducer(s, { type: "activityFinished", correct: 6, total: 8, run: 3 });
    expect(s.activity?.type).toBe("story");
    expect(s.journey).toMatchObject({ step: 2, correct: 6, total: 8 });
    expect(isLastStep(s)).toBe(true);
  });

  test("completing a lesson shows the celebration and clears the journey", () => {
    const s = navReducer(start(), { type: "lessonComplete", result: { correct: 9, total: 10, earned: 3, before: 1, after: 3, xp: 300 } });
    expect(s.view).toBe("done");
    expect(s.journey).toBeNull();
    expect(s.done?.after).toBe(3);
  });

  test("leaving a guided lesson goes to the map; leaving practice goes to the lesson page", () => {
    expect(navReducer(start(), { type: "exitActivity" }).view).toBe("home");
    const practising = navReducer(navReducer(initialNav(true), { type: "openLesson", lessonId: 5 }), { type: "practice", activity: "quiz", run: 9 });
    expect(practising.journey).toBeNull();
    const left = navReducer(practising, { type: "exitActivity" });
    expect(left.view).toBe("lesson");
    expect(left.lessonId).toBe(5);
  });

  test("a finished practice game doesn't move anything (the screen shows its own result)", () => {
    const practising = navReducer(initialNav(true), { type: "practice", activity: "quiz", run: 9 });
    expect(navReducer(practising, { type: "activityFinished", correct: 3, total: 4, run: 10 })).toBe(practising);
  });

  test("navigating away always drops an unfinished lesson", () => {
    const s = navReducer(start(), { type: "go", view: "trophies" });
    expect(s).toMatchObject({ view: "trophies", journey: null, activity: null });
  });
});

describe("progress changes", () => {
  test("rewards and level-ups are detected and logged to the feed", () => {
    const before = normalizeProgress(null);
    const { next, rewards, levelUp } = applyChange(before, p => addXP({ ...p, stars: { 1: 1 } }, xpForLevel(2)));
    expect(rewards.map(r => r.id)).toContain("first_star");
    expect(levelUp).toBe(2);
    expect(next.events.map(e => e.type)).toEqual(expect.arrayContaining(["badge", "level"]));
  });
});

describe("Sol's mission plan", () => {
  test("marks steps done and points at the next one", () => {
    const now = Date.now();
    let p = normalizeProgress(null);
    let plan = planMission(p, now);
    expect(plan.steps[0].id).toBe("lesson");          // brand-new learner: no review step yet
    expect(plan.steps[0].active).toBe(true);
    p = recordWord(p, "Hola", "Hello", true, now);
    p = logEvent(p, { type: "review", text: "x" }, now);
    plan = planMission(p, now);
    expect(plan.steps[0]).toMatchObject({ id: "review", done: true });
    expect(plan.active?.id).toBe("lesson");
    expect(plan.completed).toBe(1);
  });
});
