// ============================================================
// The course, loaded from /content/*.json (validated in tests/CI).
// ============================================================
import worldsJson from "../../content/worlds.json";
import surprisesJson from "../../content/surprises.json";
import unitsJson from "../../content/units.json";
import type { Lesson, LessonFile, Surprise, Unit, Word, World } from "./schema.ts";

export type { Gap, Goal, Lesson, Sentence, Story, StoryQuestion, Surprise, Unit, Word, World } from "./schema.ts";

const lessonFiles = Object.values(
  import.meta.glob<LessonFile>("../../content/lessons/*.json", { eager: true, import: "default" }),
);

export const RAW_CONTENT = { worlds: worldsJson as unknown, lessonFiles: lessonFiles as unknown[], surprises: surprisesJson as unknown, units: unitsJson as unknown };

export const WORLDS = worldsJson as World[];
export const SURPRISES = surprisesJson as Surprise[];
export const UNITS = unitsJson as Unit[];
export const LESSONS: Lesson[] = lessonFiles.flatMap(f => f.lessons).sort((a, b) => a.id - b.id);
export const MILESTONES = LESSONS.filter(l => l.milestone).map(l => l.id);

export const lessonById = (id: number): Lesson | undefined => LESSONS.find(l => l.id === id);
export const isMilestone = (id: number) => !!lessonById(id)?.milestone;

// A tiny deterministic hash so each lesson always gets the same variety.
export const lessonSeed = (id: number) => (id * 2654435761) % 2 ** 12;
export const surpriseFor = (id: number) => SURPRISES[lessonSeed(id) % SURPRISES.length];

export const worldOf = (lessonId: number): World | undefined =>
  WORLDS.find(w => lessonId >= w.range[0] && lessonId <= w.range[1]);
export const lessonsInWorld = (world: World) =>
  LESSONS.filter(l => l.id >= world.range[0] && l.id <= world.range[1]);

const uniqueWords = (lessons: Lesson[]): Word[] => {
  const seen = new Set<string>();
  const out: Word[] = [];
  for (const l of lessons) for (const w of l.words) if (!seen.has(w.es)) { seen.add(w.es); out.push(w); }
  return out;
};

// Every distinct word in the course (distractors, emoji look-ups, search).
export const ALL_WORDS = uniqueWords(LESSONS);
export const wordsForLessonsUpTo = (maxLessonId: number) => uniqueWords(LESSONS.filter(l => l.id <= maxLessonId));
export const wordsForWorld = (lessonId: number) => {
  const w = worldOf(lessonId);
  return w ? uniqueWords(lessonsInWorld(w)) : [];
};
