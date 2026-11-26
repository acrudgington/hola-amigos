// ============================================================
// The course, loaded from /content/*.json (validated in tests/CI).
// ============================================================
import worldsJson from "../../content/worlds.json";
import surprisesJson from "../../content/surprises.json";
import unitsJson from "../../content/units.json";
import storiesJson from "../../content/stories.json";
import chantsJson from "../../content/chants.json";
import { PACK_ID_START, type Book, type Chant, type Conversation, type ConversationFile, type Lesson, type LessonFile, type Pack, type Surprise, type Unit, type Word, type World } from "./schema.ts";

export type { Book, Chant, Conversation, Pack, Turn, Gap, Goal, Lesson, Sentence, Story, StoryQuestion, Surprise, Unit, Word, World } from "./schema.ts";

const lessonFiles = Object.values(
  import.meta.glob<LessonFile>("../../content/lessons/*.json", { eager: true, import: "default" }),
);

const conversationFiles = Object.values(
  import.meta.glob<ConversationFile>("../../content/conversations/*.json", { eager: true, import: "default" }),
);
export const CONVERSATIONS: Conversation[] = conversationFiles.flatMap(f => f.conversations).sort((a, b) => a.lesson - b.lesson);

// ---------- packs (school kit, seasonal events, parent course) ----------
const packFiles = Object.values(import.meta.glob<Pack>("../../content/packs/*.json", { eager: true, import: "default" }));
const PACK_ORDER = ["school", "halloween", "christmas", "parents"];
export const PACKS: Pack[] = [...packFiles].sort((a, b) => PACK_ORDER.indexOf(a.id) - PACK_ORDER.indexOf(b.id));
export const PACK_LESSONS: Lesson[] = PACKS.flatMap(p => p.lessons);
export const PACK_CONVERSATIONS: Conversation[] = PACKS.flatMap(p => p.conversations);
export const isPackLesson = (id: number) => id >= PACK_ID_START;
export const packOf = (lessonId: number): Pack | undefined => PACKS.find(p => p.lessons.some(l => l.id === lessonId));
export const packById = (id: string): Pack | undefined => PACKS.find(p => p.id === id);

export const conversationFor = (lessonId: number): Conversation | undefined =>
  (isPackLesson(lessonId) ? PACK_CONVERSATIONS : CONVERSATIONS).find(c => c.lesson === lessonId);

export const RAW_CONTENT = { worlds: worldsJson as unknown, lessonFiles: lessonFiles as unknown[], surprises: surprisesJson as unknown, units: unitsJson as unknown, books: storiesJson as unknown, chants: chantsJson as unknown, conversationFiles: conversationFiles as unknown[], packs: packFiles as unknown[] };

export const WORLDS = worldsJson as World[];
export const SURPRISES = surprisesJson as Surprise[];
export const UNITS = unitsJson as Unit[];
export const BOOKS = storiesJson as Book[];
export const CHANTS = chantsJson as Chant[];
export const LESSONS: Lesson[] = lessonFiles.flatMap(f => f.lessons).sort((a, b) => a.id - b.id);
export const MILESTONES = LESSONS.filter(l => l.milestone).map(l => l.id);

export const lessonById = (id: number): Lesson | undefined => LESSONS.find(l => l.id === id) ?? PACK_LESSONS.find(l => l.id === id);
// The lesson after this one: the next on the map, or the next in its pack.
export function nextLessonAfter(lesson: Lesson): Lesson | undefined {
  const pack = packOf(lesson.id);
  if (!pack) return LESSONS.find(l => l.id === lesson.id + 1);
  const i = pack.lessons.findIndex(l => l.id === lesson.id);
  return pack.lessons[i + 1];
}
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

// The other words taught alongside a word (its "siblings" — the most confusable
// distractors, e.g. Buenos días / Buenas tardes / Buenas noches).
const firstLessonOf = new Map<string, Lesson>();
for (const l of LESSONS) for (const w of l.words) if (!firstLessonOf.has(w.es)) firstLessonOf.set(w.es, l);
export const siblingsOf = (es: string): Word[] => (firstLessonOf.get(es)?.words ?? []).filter(w => w.es !== es);
export const wordsForWorld = (lessonId: number) => {
  const w = worldOf(lessonId);
  return w ? uniqueWords(lessonsInWorld(w)) : [];
};
