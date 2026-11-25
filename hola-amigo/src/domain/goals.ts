// "I can…" goals: how far a child has got with each one.
//
//   not started → practising (any of its lessons played) → achieved
//
// A goal is achieved when all its lessons are done AND the child reliably knows
// most of their words (memory box 2+, i.e. answered right on more than one
// occasion). Finishing lessons alone isn't enough to claim a child "can" do it.
import { UNITS, lessonById, type Goal, type Unit } from "../content/index.ts";
import type { Progress } from "./progress.ts";

export const KNOWN_BOX = 2;
export const ACHIEVED_SHARE = 0.6;

export type GoalState = "not-started" | "practising" | "achieved";
export type Level = "pre-a1" | "a1" | "a2-taster";

export interface GoalProgress {
  goal: Goal;
  unit: Unit;
  level: Level;
  state: GoalState;
  lessonsDone: number;
  lessonsTotal: number;
  wordsKnown: number;
  wordsTotal: number;
  score: number;      // 0..1, for progress bars
}

export const goalLevel = (unit: Unit, goal: Goal): Level => (goal.taster ? "a2-taster" : unit.level);

export const LEVEL_INFO: Record<Level, { label: string; short: string; about: string }> = {
  "pre-a1": { label: "Pre-A1", short: "Pre-A1", about: "First words and phrases: greetings, numbers, colours, family, everyday things." },
  "a1": { label: "A1 · Beginner", short: "A1", about: "Simple everyday phrases and sentences about themselves, their home, school and town." },
  "a2-taster": { label: "A2 taster", short: "A2 taster", about: "A first taste of A2 (elementary) Spanish: talking about the past, opinions and comparisons. Not full A2 yet." },
};

function wordsOf(goal: Goal): string[] {
  const seen = new Set<string>();
  for (const id of goal.lessons) for (const w of lessonById(id)?.words ?? []) seen.add(w.es);
  return [...seen];
}

export function goalProgress(p: Pick<Progress, "stars" | "wordMemory">, unit: Unit, goal: Goal): GoalProgress {
  const stars = p.stars || {};
  const lessonsDone = goal.lessons.filter(id => (stars[id] || 0) > 0).length;
  const words = wordsOf(goal);
  const wordsKnown = words.filter(es => (p.wordMemory?.[es]?.box || 0) >= KNOWN_BOX).length;
  const lessonShare = lessonsDone / goal.lessons.length;
  const knownShare = words.length ? wordsKnown / words.length : lessonShare;
  const state: GoalState = lessonsDone === goal.lessons.length && knownShare >= ACHIEVED_SHARE ? "achieved"
    : lessonsDone > 0 ? "practising" : "not-started";   // shared words alone don't start a goal
  const score = state === "achieved" ? 1 : Math.min(0.99, 0.5 * lessonShare + 0.5 * Math.min(1, knownShare / ACHIEVED_SHARE));
  return { goal, unit, level: goalLevel(unit, goal), state, lessonsDone, lessonsTotal: goal.lessons.length, wordsKnown, wordsTotal: words.length, score };
}

export interface UnitProgress { unit: Unit; goals: GoalProgress[]; achieved: number; started: boolean }

export function allGoals(p: Pick<Progress, "stars" | "wordMemory">): UnitProgress[] {
  return UNITS.map(unit => {
    const goals = unit.goals.map(g => goalProgress(p, unit, g));
    return { unit, goals, achieved: goals.filter(g => g.state === "achieved").length, started: goals.some(g => g.state !== "not-started") };
  });
}

// Achieved / total per level, for the summary chips.
export function levelSummary(units: UnitProgress[]): Record<Level, { achieved: number; total: number }> {
  const out: Record<Level, { achieved: number; total: number }> = { "pre-a1": { achieved: 0, total: 0 }, "a1": { achieved: 0, total: 0 }, "a2-taster": { achieved: 0, total: 0 } };
  for (const u of units) for (const g of u.goals) { out[g.level].total++; if (g.state === "achieved") out[g.level].achieved++; }
  return out;
}

// What to work on next: a goal already in progress (nearest to done), else the first not started.
export function nextGoal(units: UnitProgress[]): GoalProgress | null {
  const goals = units.flatMap(u => u.goals);
  const going = goals.filter(g => g.state === "practising").sort((a, b) => b.score - a.score);
  return going[0] ?? goals.find(g => g.state === "not-started") ?? null;
}

export const achievedGoals = (p: Pick<Progress, "stars" | "wordMemory">) =>
  allGoals(p).flatMap(u => u.goals).filter(g => g.state === "achieved");
