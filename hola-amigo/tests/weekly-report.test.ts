import { describe, expect, it } from "vitest";
import { LESSONS, UNITS } from "../src/content/index.ts";
import { stampGoals } from "../src/domain/goals.ts";
import { addXP, awardStars, dayKey, logEvent, normalizeProgress, recordWord } from "../src/domain/progress.ts";
import { applyChange } from "../src/state/useProgress.ts";
import { headline, reportText, weeklyReport } from "../src/domain/weeklyReport.ts";

const DAY = 86400000;
const NOW = new Date(2026, 10, 25, 18, 0).getTime();
const fresh = () => normalizeProgress(null);
const hello = UNITS[0].goals.find(g => g.lessons.includes(1))!;

// Finish lesson 1 and answer every word right twice, at time t.
function playLesson1(p = fresh(), t = NOW) {
  let n = p;
  for (const w of LESSONS[0].words) { n = recordWord(n, w.es, w.en, true, t); n = recordWord(n, w.es, w.en, true, t); }
  n = addXP(awardStars(n, 1, 3), 120, t);
  return logEvent(n, { type: "lesson", text: "Finished lesson 1" }, t);
}

describe("weekly report", () => {
  it("is quiet for a learner who hasn't played", () => {
    const r = weeklyReport("Mia", fresh(), NOW);
    expect(r.quiet).toBe(true);
    expect(r.activeDays).toBe(0);
    expect(headline(r)).toMatch(/didn’t play/);
    expect(reportText(r)).toContain("Mia");
  });

  it("counts this week's activity, new words and new goals", () => {
    const p = stampGoals(playLesson1(), NOW);
    expect(p.goalsAt[hello.id]).toBe(NOW);
    const r = weeklyReport("Mia", p, NOW);
    expect(r.quiet).toBe(false);
    expect(r.activeDays).toBe(1);
    expect(r.counts.lesson).toBe(1);
    expect(r.newWords.length).toBe(LESSONS[0].words.length);
    expect(r.goalsThisWeek.map(g => g.id)).toEqual([hello.id]);
    const text = reportText(r);
    expect(text).toContain(hello.can);
    expect(text).toContain("1 lesson");
  });

  it("leaves out last week's work", () => {
    const old = NOW - 9 * DAY;
    const p = stampGoals(playLesson1(fresh(), old), old);
    const r = weeklyReport("Mia", p, NOW);
    expect(r.quiet).toBe(true);
    expect(r.newWords).toEqual([]);
    expect(r.goalsThisWeek).toEqual([]);
    expect(r.goalsTotal.achieved).toBe(1);
  });

  it("only keeps about two months of daily counts", () => {
    let p = logEvent(fresh(), { type: "lesson", text: "x" }, NOW - 100 * DAY);
    p = logEvent(p, { type: "chant", text: "y" }, NOW);
    expect(Object.keys(p.doneByDay)).toEqual([dayKey(NOW)]);
    expect(p.doneByDay[dayKey(NOW)].chant).toBe(1);
  });

  it("stamps goals as they are achieved during play", () => {
    const { next } = applyChange(fresh(), p => playLesson1(p));
    expect(next.goalsAt[hello.id]).toBeGreaterThan(0);
  });

  it("treats goals achieved in old saves as before tracking", () => {
    const { goalsAt: _drop, doneByDay: _d, ...old } = playLesson1();
    const p = normalizeProgress(old);
    expect(p.goalsAt[hello.id]).toBe(0);
    expect(weeklyReport("Mia", p, NOW).goalsThisWeek).toEqual([]);
  });
});
