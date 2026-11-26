// ============================================================
// Navigation & lesson-flow state machine.
// One pure reducer decides which screen is showing and where the child is
// in a guided lesson. No timers, no storage, no randomness: the caller
// passes in anything time-based (run ids), so every transition is testable.
// ============================================================
import type { ActivityType } from "../lib/journey.ts";

export type ShellView = "home" | "review" | "stories" | "trophies" | "profile";
export type View = "family" | "dashboard" | ShellView | "lesson" | "activity" | "done" | "placement" | "together" | "pack";

export interface Journey {
  steps: ActivityType[];
  step: number;
  correct: number;
  total: number;
}

export interface DoneResult {
  correct: number;
  total: number;
  earned: number;   // stars earned this run
  before: number;   // best stars before this run
  after: number;    // best stars now
  xp: number;       // XP earned during the whole lesson
}

export interface NavState {
  view: View;
  lessonId: number;
  activity: { type: ActivityType; run: number } | null;  // run: a fresh id remounts the game
  journey: Journey | null;                                // null = free practice
  done: DoneResult | null;
  packId?: string;                                        // the pack page that's open (view "pack")
}

export type NavAction =
  | { type: "go"; view: "family" | "dashboard" | "placement" | "together" | ShellView }
  | { type: "openLesson"; lessonId: number }
  | { type: "openPack"; packId: string }
  | { type: "startLesson"; lessonId: number; steps: ActivityType[]; run: number }
  | { type: "practice"; activity: ActivityType; run: number }
  | { type: "activityFinished"; correct: number; total: number; run: number }
  | { type: "lessonComplete"; result: DoneResult }
  | { type: "exitActivity" };

export const initialNav = (hasChild: boolean): NavState => ({
  view: hasChild ? "home" : "family", lessonId: 1, activity: null, journey: null, done: null,
});

// Is the current guided lesson on its final activity?
export const isLastStep = (s: NavState) => !!s.journey && s.journey.step + 1 >= s.journey.steps.length;

export function navReducer(s: NavState, a: NavAction): NavState {
  switch (a.type) {
    case "go":
      return { ...s, view: a.view, activity: null, journey: null };

    case "openPack":
      return { ...s, view: "pack", packId: a.packId, activity: null, journey: null };

    case "openLesson":
      return { ...s, view: "lesson", lessonId: a.lessonId, activity: null, journey: null };

    case "startLesson":
      if (!a.steps.length) return s;
      return {
        ...s, view: "activity", lessonId: a.lessonId, done: null,
        journey: { steps: a.steps, step: 0, correct: 0, total: 0 },
        activity: { type: a.steps[0], run: a.run },
      };

    case "practice":
      return { ...s, view: "activity", journey: null, activity: { type: a.activity, run: a.run } };

    case "activityFinished": {
      // Free practice: the activity screen shows its own result card.
      if (!s.journey || s.view !== "activity") return s;
      const j = { ...s.journey, correct: s.journey.correct + a.correct, total: s.journey.total + a.total };
      const next = j.step + 1;
      if (next >= j.steps.length) return { ...s, journey: j };   // caller follows up with lessonComplete
      return { ...s, journey: { ...j, step: next }, activity: { type: j.steps[next], run: a.run } };
    }

    case "lessonComplete":
      return { ...s, view: "done", done: a.result, journey: null, activity: null };

    case "exitActivity":
      // Leaving a guided lesson goes back to the map; leaving practice goes back to the lesson page.
      return s.journey
        ? { ...s, view: "home", journey: null, activity: null }
        : { ...s, view: "lesson", activity: null };
  }
}
