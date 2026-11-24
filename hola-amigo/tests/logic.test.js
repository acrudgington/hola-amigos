// Run with: npm test   (uses Node's built-in test runner — no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { LESSONS, WORLDS, isMilestone } from "../src/data/course.js";
import { applyRewards, BADGES } from "../src/data/rewards.js";
import {
  DEFAULT_PROGRESS, awardStars, bumpDaily, getDaily, getDueWords, liveStreak,
  recordWord, repairProgress, starsForScore, touchStreak,
} from "../src/lib/db.js";
import { buildJourney } from "../src/lib/journey.js";
import { buildOptions, shuffle } from "../src/lib/utils.js";
import { similarity } from "../src/lib/speech.js";

const fresh = () => structuredClone({ ...DEFAULT_PROGRESS });
const DAY = 86400000;

test("course data is complete and consistent", () => {
  assert.equal(LESSONS.length, 100);
  for (const l of LESSONS) {
    assert.ok(l.words.length >= 4, `lesson ${l.id} has too few words`);
    for (const w of l.words) assert.ok(w.es && w.en && w.emoji && w.say, `lesson ${l.id}: incomplete word ${w.es}`);
    for (const s of l.sentences) assert.deepEqual([...s.correct].sort(), [...s.shuffle].sort(), `lesson ${l.id}: sentence tiles don't match`);
    for (const g of l.gaps) assert.ok(g.ans >= 0 && g.ans < g.opts.length);
    assert.ok(l.story, `lesson ${l.id} has no story`);
    for (const q of l.story.qs) assert.ok(q.ans >= 0 && q.ans < q.opts.length);
  }
  const covered = WORLDS.flatMap(w => Array.from({ length: w.range[1] - w.range[0] + 1 }, (_, i) => w.range[0] + i));
  assert.deepEqual(covered, LESSONS.map(l => l.id));
});

test("World Conqueror is not awarded for an untouched world (old bug)", () => {
  const p = { ...fresh(), stars: { 1: 1 } };
  const { progress } = applyRewards(p);
  assert.ok(progress.badges.includes("first_star"));
  assert.ok(!progress.badges.includes("perfect_world"));
  const all = { ...fresh(), stars: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [i, 3])) };
  assert.ok(applyRewards(all).progress.badges.includes("perfect_world"));
});

test("repairProgress removes a wrongly awarded World Conqueror badge", () => {
  const p = { ...fresh(), stars: { 1: 1 }, badges: ["first_star", "perfect_world"] };
  const earned = (id, x) => BADGES.find(b => b.id === id).check(x);
  assert.deepEqual(repairProgress(p, earned).badges, ["first_star"]);
});

test("rewards are reported once", () => {
  const first = applyRewards({ ...fresh(), stars: { 1: 1 } });
  assert.ok(first.rewards.length > 0);
  assert.equal(applyRewards(first.progress).rewards.length, 0);
});

test("stars keep the best result and scale with score", () => {
  assert.equal(starsForScore(10, 10), 3);
  assert.equal(starsForScore(7, 10), 2);
  assert.equal(starsForScore(2, 10), 1);
  assert.equal(starsForScore(0, 0), 1);
  let p = awardStars(fresh(), 5, 2);
  p = awardStars(p, 5, 1);
  assert.equal(p.stars[5], 2);
  assert.equal(awardStars(p, 5, 3).stars[5], 3);
});

test("spaced repetition boxes and due dates", () => {
  const now = Date.now();
  let p = recordWord(fresh(), "Hola", "Hello", true, now);
  assert.equal(p.wordMemory.Hola.box, 1);
  assert.equal(getDueWords(p, now).length, 0);
  assert.equal(getDueWords(p, now + DAY + 1).length, 1);
  p = recordWord(p, "Hola", "Hello", true, now);
  assert.equal(p.wordMemory.Hola.box, 2);
  p = recordWord(p, "Hola", "Hello", false, now);
  assert.equal(p.wordMemory.Hola.box, 1);
});

test("daily goal counts and reports when it is first met", () => {
  let p = fresh();
  let r;
  for (let i = 0; i < 3; i++) { r = bumpDaily(p); p = r.progress; }
  assert.equal(r.justMet, true);
  assert.equal(getDaily(p).met, true);
  assert.equal(bumpDaily(p).justMet, false);
});

test("streaks continue on consecutive days and reset after a gap", () => {
  const day1 = new Date(2026, 0, 10, 9).getTime();
  let p = touchStreak(fresh(), day1);
  assert.equal(p.streak, 1);
  p = touchStreak(p, day1 + DAY);
  assert.equal(p.streak, 2);
  assert.equal(touchStreak(p, day1 + DAY + 3600000).streak, 2); // same day
  assert.equal(liveStreak(p, day1 + 3 * DAY), 0);                // skipped a day
  assert.equal(touchStreak(p, day1 + 3 * DAY).streak, 1);
});

test("journeys always have content and milestones are boss battles", () => {
  for (const l of LESSONS) {
    const j = buildJourney(l);
    assert.ok(j.length >= 3);
    if (isMilestone(l.id)) assert.ok(j.includes("boss"));
    if (l.id === 1) assert.ok(!j.includes("warmup"));
  }
});

test("multiple-choice options never repeat an answer", () => {
  const pool = [...LESSONS[0].words, { es: "X", en: "Hello", emoji: "❓" }];
  for (let i = 0; i < 50; i++) {
    const opts = buildOptions(pool[0], pool);
    assert.equal(new Set(opts.map(o => o.en)).size, opts.length);
    assert.ok(opts.includes(pool[0]));
  }
  assert.deepEqual(shuffle([1, 2, 3]).sort(), [1, 2, 3]);
});

test("speech matching ignores accents and punctuation", () => {
  assert.equal(similarity("¿Qué tal?", "que tal"), 1);
  assert.ok(similarity("buenos dias", "Buenos días") === 1);
  assert.ok(similarity("hola", "adiós") < 0.5);
});

import { XP, addXP, claimChest, dailyQuests, dayKey, levelInfo, recordCombo, weekXP } from "../src/lib/db.js";

test("XP adds up per day and levels follow the curve", () => {
  const now = new Date(2026, 4, 10, 12).getTime();
  let p = addXP(fresh(), 100, now);
  p = addXP(p, 30, now);
  assert.equal(p.xp, 130);
  assert.equal(p.xpByDay[dayKey(now)], 130);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(119).level, 1);
  assert.equal(levelInfo(120).level, 2);
  assert.equal(levelInfo(360).level, 3);
  const w = weekXP(p, now);
  assert.equal(w.length, 7);
  assert.equal(w[6].xp, 130);
});

test("daily quest chest opens once, only when all quests are done", () => {
  const now = Date.now();
  let p = fresh();
  assert.equal(claimChest(p, now), p);
  for (let i = 0; i < 3; i++) p = bumpDaily(p).progress;
  p = recordCombo(addXP(p, 120, now), 5, now);
  assert.equal(dailyQuests(p, now).allDone, true);
  const opened = claimChest(p, now);
  assert.equal(opened.xp, p.xp + XP.chest);
  assert.equal(claimChest(opened, now), opened);
});

import { logEvent, timeAgo } from "../src/lib/db.js";
import { planMission } from "../src/lib/mission.js";

test("Sol's mission plan marks steps done and points at the next one", () => {
  const now = Date.now();
  let p = fresh();
  let plan = planMission(p, now);
  assert.equal(plan.steps[0].id, "lesson");          // brand-new learner: no review step yet
  assert.equal(plan.steps[0].active, true);
  p = recordWord(p, "Hola", "Hello", true, now);
  p = logEvent(p, { type: "review", text: "x" }, now);
  plan = planMission(p, now);
  assert.equal(plan.steps[0].id, "review");
  assert.equal(plan.steps[0].done, true);
  assert.equal(plan.active.id, "lesson");
  assert.equal(plan.completed, 1);
});

test("activity feed keeps the newest 40 events", () => {
  let p = fresh();
  for (let i = 0; i < 45; i++) p = logEvent(p, { type: "lesson", text: `e${i}` }, 1000 + i);
  assert.equal(p.events.length, 40);
  assert.equal(p.events[0].text, "e44");
  assert.equal(timeAgo(Date.now() - 5 * 60000), "5 min ago");
});
