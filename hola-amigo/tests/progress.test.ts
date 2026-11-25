import { describe, expect, test } from "vitest";
import {
  DEFAULT_PROGRESS, XP, addXP, awardStars, bumpDaily, claimChest, dailyQuests, dayKey, getDaily, getDueWords,
  levelInfo, liveStreak, logEvent, normalizeProgress, recordCombo, recordWord, repairProgress, starsForScore,
  timeAgo, touchStreak, weekXP, type Progress,
} from "../src/domain/progress.ts";
import { applyRewards, isBadgeEarned } from "../src/domain/rewards.ts";

const fresh = (): Progress => normalizeProgress(null);
const DAY = 86400000;

describe("stars", () => {
  test("scale with score and keep the best result", () => {
    expect(starsForScore(10, 10)).toBe(3);
    expect(starsForScore(7, 10)).toBe(2);
    expect(starsForScore(2, 10)).toBe(1);
    expect(starsForScore(0, 0)).toBe(1);
    let p = awardStars(fresh(), 5, 2);
    p = awardStars(p, 5, 1);
    expect(p.stars[5]).toBe(2);
    expect(awardStars(p, 5, 3).stars[5]).toBe(3);
  });
});

describe("spaced repetition", () => {
  test("promotes on success, demotes on a miss, and schedules reviews", () => {
    const now = Date.now();
    let p = recordWord(fresh(), "Hola", "Hello", true, now);
    expect(p.wordMemory.Hola.box).toBe(1);
    expect(getDueWords(p, now)).toHaveLength(0);
    expect(getDueWords(p, now + DAY + 1)).toHaveLength(1);
    p = recordWord(p, "Hola", "Hello", true, now);
    expect(p.wordMemory.Hola.box).toBe(2);
    p = recordWord(p, "Hola", "Hello", false, now);
    expect(p.wordMemory.Hola.box).toBe(1);
  });
});

describe("daily goal & streaks", () => {
  test("daily goal reports the moment it is first met", () => {
    let p = fresh();
    let r = bumpDaily(p);
    for (let i = 0; i < 3; i++) { r = bumpDaily(p); p = r.progress; }
    expect(r.justMet).toBe(true);
    expect(getDaily(p).met).toBe(true);
    expect(bumpDaily(p).justMet).toBe(false);
  });

  test("streaks continue on consecutive days and reset after a gap", () => {
    const day1 = new Date(2026, 0, 10, 9).getTime();
    let p = touchStreak(fresh(), day1);
    expect(p.streak).toBe(1);
    p = touchStreak(p, day1 + DAY);
    expect(p.streak).toBe(2);
    expect(touchStreak(p, day1 + DAY + 3600000).streak).toBe(2);
    expect(liveStreak(p, day1 + 3 * DAY)).toBe(0);
    expect(touchStreak(p, day1 + 3 * DAY).streak).toBe(1);
  });
});

describe("XP, levels, quests & feed", () => {
  test("XP adds up per day and levels follow the curve", () => {
    const now = new Date(2026, 4, 10, 12).getTime();
    const p = addXP(addXP(fresh(), 100, now), 30, now);
    expect(p.xp).toBe(130);
    expect(p.xpByDay[dayKey(now)]).toBe(130);
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(119).level).toBe(1);
    expect(levelInfo(120).level).toBe(2);
    expect(levelInfo(360).level).toBe(3);
    expect(weekXP(p, now)[6].xp).toBe(130);
  });

  test("the chest opens once, only when all quests are done", () => {
    const now = Date.now();
    let p = fresh();
    expect(claimChest(p, now)).toBe(p);
    for (let i = 0; i < 3; i++) p = bumpDaily(p, now).progress;
    p = recordCombo(addXP(p, 120, now), 5, now);
    expect(dailyQuests(p, now).allDone).toBe(true);
    const opened = claimChest(p, now);
    expect(opened.xp).toBe(p.xp + XP.chest);
    expect(claimChest(opened, now)).toBe(opened);
  });

  test("the activity feed keeps the newest 40 events", () => {
    let p = fresh();
    for (let i = 0; i < 45; i++) p = logEvent(p, { type: "lesson", text: `e${i}` }, 1000 + i);
    expect(p.events).toHaveLength(40);
    expect(p.events[0].text).toBe("e44");
    expect(timeAgo(Date.now() - 5 * 60000)).toBe("5 min ago");
  });
});

describe("saves from older versions", () => {
  test("missing fields are filled in and pre-XP saves get a starting total", () => {
    const p = normalizeProgress({ stars: { 1: 3, 2: 2 }, correctAnswers: 20 });
    expect(p.events).toEqual([]);
    expect(p.xp).toBe(20 * XP.correct + 5 * XP.perStar + 2 * XP.lesson);
    expect(normalizeProgress(null)).toEqual(structuredClone(DEFAULT_PROGRESS));
  });
});

describe("rewards", () => {
  test("World Conqueror needs every lesson in a world at 3 stars (old bug)", () => {
    const { progress } = applyRewards({ ...fresh(), stars: { 1: 1 } });
    expect(progress.badges).toContain("first_star");
    expect(progress.badges).not.toContain("perfect_world");
    const all = { ...fresh(), stars: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [i, 3])) };
    expect(applyRewards(all).progress.badges).toContain("perfect_world");
  });

  test("a wrongly awarded World Conqueror badge is removed", () => {
    const p = { ...fresh(), stars: { 1: 1 }, badges: ["first_star", "perfect_world"] };
    expect(repairProgress(p, isBadgeEarned).badges).toEqual(["first_star"]);
  });

  test("each reward is reported only once", () => {
    const first = applyRewards({ ...fresh(), stars: { 1: 1 } });
    expect(first.rewards.length).toBeGreaterThan(0);
    expect(applyRewards(first.progress).rewards).toHaveLength(0);
  });
});
