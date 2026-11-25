// ============================================================
// Course content schema. Content lives in /content/*.json so it can be
// edited (and one day served from a CMS) without touching code. Every file
// is checked against these schemas by `npm run content:check` and in CI.
// ============================================================
import { z } from "zod";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "must be a #RRGGBB colour");
const text = z.string().trim().min(1);

export const WordSchema = z.object({
  es: text,
  en: text,
  say: text,       // Castilian pronunciation guide, e.g. "GRAH-thyass"
  emoji: text,
});

export const SentenceSchema = z.object({
  en: text,
  correct: z.array(text).min(2),
  shuffle: z.array(text).min(2),
});

export const GapSchema = z.object({
  q: text,
  opts: z.array(text).min(2),
  ans: z.number().int().min(0),
});

export const StoryQuestionSchema = z.object({
  q: text,
  opts: z.array(text).min(2),
  ans: z.number().int().min(0),
});

export const StorySchema = z.object({
  title: text,
  paras: z.array(text).min(1),
  qs: z.array(StoryQuestionSchema).min(1),
});

export const LessonSchema = z.object({
  id: z.number().int().positive(),
  title: text,
  subtitle: text,
  emoji: text,
  milestone: z.boolean(),
  funFact: text,
  phrase: z.object({ es: text, en: text }),
  words: z.array(WordSchema).min(4),
  sentences: z.array(SentenceSchema),
  gaps: z.array(GapSchema),
  story: StorySchema,
});

export const LessonFileSchema = z.object({
  world: z.number().int().positive(),
  lessons: z.array(LessonSchema).min(1),
});

export const WorldSchema = z.object({
  id: z.number().int().positive(),
  name: text,
  emoji: text,
  color: hex,
  desc: text,
  range: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  deco: z.array(text),
  scene: z.enum(["island", "town", "city", "story", "plaza", "bridge", "castle", "home", "play", "nature", "self", "stars"]),
  tint: hex,
});

export const SurpriseSchema = z.object({
  id: text,
  emoji: text,
  title: text,
  lines: z.array(text).min(1),
});

// "I can…" units: one per world, each with plain-English goals that link to the
// lessons that teach them. Levels are honest CEFR bands (see content/review/README.md).
export const GoalSchema = z.object({
  id: text,
  can: z.string().regex(/^I can /, "goals start with \"I can \""),
  es: text,
  lessons: z.array(z.number().int().positive()).min(1),
  taster: z.boolean().optional(),   // a first taste of A2 grammar
});
export const UnitSchema = z.object({
  world: z.number().int().positive(),
  title: text,
  level: z.enum(["pre-a1", "a1"]),
  goals: z.array(GoalSchema).min(1),
});

// Spanish stories: one per unit, read aloud sentence by sentence.
export const BookSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  world: z.number().int().positive(),
  title: text,
  en: text,
  emoji: text,
  sentences: z.array(z.object({ es: text, en: text })).min(5).max(12),
  questions: z.array(StoryQuestionSchema).min(2),
});

// Chants and rhymes: spoken in rhythm by Sol and Luna, line by line.
export const ChantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  world: z.number().int().positive(),
  title: text,
  en: text,
  emoji: text,
  bpm: z.number().int().min(60).max(140),
  lines: z.array(z.object({ who: z.enum(["sol", "luna"]), es: text, en: text })).min(4).max(10),
});

export type Word = z.infer<typeof WordSchema>;
export type Sentence = z.infer<typeof SentenceSchema>;
export type Gap = z.infer<typeof GapSchema>;
export type Story = z.infer<typeof StorySchema>;
export type StoryQuestion = z.infer<typeof StoryQuestionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonFile = z.infer<typeof LessonFileSchema>;
export type World = z.infer<typeof WorldSchema>;
export type Surprise = z.infer<typeof SurpriseSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type Book = z.infer<typeof BookSchema>;
export type Chant = z.infer<typeof ChantSchema>;

export interface ContentIssue { level: "error" | "warning"; where: string; message: string }

const sameMultiset = (a: string[], b: string[]) => [...a].sort().join("\u0000") === [...b].sort().join("\u0000");
const dupes = <T,>(xs: T[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

// Rules that a schema alone can't express: cross-file consistency and
// teaching-quality checks. Errors fail the build; warnings are reported.
export function checkCourse(worlds: unknown, lessonFiles: unknown[], surprises: unknown, units?: unknown, books?: unknown, chants?: unknown): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });

  const w = z.array(WorldSchema).safeParse(worlds);
  if (!w.success) { w.error.issues.forEach(i => err(`worlds.json:${i.path.join(".")}`, i.message)); return issues; }
  const s = z.array(SurpriseSchema).safeParse(surprises);
  if (!s.success) s.error.issues.forEach(i => err(`surprises.json:${i.path.join(".")}`, i.message));

  const lessons: Lesson[] = [];
  lessonFiles.forEach((f, fi) => {
    const r = LessonFileSchema.safeParse(f);
    if (!r.success) { r.error.issues.forEach(i => err(`lesson file #${fi + 1}:${i.path.join(".")}`, i.message)); return; }
    const world = w.data.find(x => x.id === r.data.world);
    if (!world) err(`world ${r.data.world}`, "lesson file refers to a world that doesn't exist");
    for (const l of r.data.lessons) {
      if (world && (l.id < world.range[0] || l.id > world.range[1])) err(`lesson ${l.id}`, `outside ${world.name}'s range ${world.range.join("–")}`);
      lessons.push(l);
    }
  });

  // Lesson ids must run 1…N with no gaps, and world ranges must tile them.
  const ids = lessons.map(l => l.id).sort((a, b) => a - b);
  ids.forEach((id, i) => { if (id !== i + 1) err(`lesson ${id}`, `expected lesson ${i + 1} here (ids must be 1…${ids.length} with no gaps)`); });
  dupes(ids).forEach(id => err(`lesson ${id}`, "duplicate lesson id"));
  const ranges = [...w.data].sort((a, b) => a.range[0] - b.range[0]);
  ranges.forEach((x, i) => {
    const expectStart = i === 0 ? 1 : ranges[i - 1].range[1] + 1;
    if (x.range[0] !== expectStart) err(`world ${x.id}`, `range should start at lesson ${expectStart}`);
  });

  for (const l of lessons) {
    const at = `lesson ${l.id}`;
    dupes(l.words.map(x => x.es)).forEach(es => err(at, `word "${es}" appears twice`));
    dupes(l.words.map(x => x.en)).forEach(en => warn(at, `two words both mean "${en}" — multiple-choice games may look ambiguous`));
    dupes(l.words.map(x => x.emoji)).forEach(e => warn(at, `emoji ${e} used for more than one word (picture-only games skip duplicates)`));
    l.sentences.forEach((x, i) => { if (!sameMultiset(x.correct, x.shuffle)) err(`${at} sentence ${i + 1}`, "word tiles don't match the correct answer"); });
    l.gaps.forEach((g, i) => {
      if (g.ans >= g.opts.length) err(`${at} gap ${i + 1}`, "answer index is out of range");
      if (dupes(g.opts).length) err(`${at} gap ${i + 1}`, "options repeat");
    });
    l.story.qs.forEach((q, i) => {
      if (q.ans >= q.opts.length) err(`${at} story question ${i + 1}`, "answer index is out of range");
      if (dupes(q.opts).length) err(`${at} story question ${i + 1}`, "options repeat");
    });
  }
  // Units: one per world; every lesson is taught by exactly one goal, inside its own world.
  if (units !== undefined) {
    const u = z.array(UnitSchema).safeParse(units);
    if (!u.success) u.error.issues.forEach(i => err(`units.json:${i.path.join(".")}`, i.message));
    else {
      for (const world of w.data) if (!u.data.some(x => x.world === world.id)) err(`units.json`, `no unit for world ${world.id} (${world.name})`);
      dupes(u.data.map(x => x.world)).forEach(id => err(`units.json`, `two units for world ${id}`));
      dupes(u.data.flatMap(x => x.goals.map(g => g.id))).forEach(id => err(`units.json`, `goal id "${id}" is used twice`));
      const covered = new Map<number, string>();
      for (const unit of u.data) {
        const world = w.data.find(x => x.id === unit.world);
        if (!world) { err(`units.json`, `unit for unknown world ${unit.world}`); continue; }
        for (const g of unit.goals) for (const id of g.lessons) {
          if (id < world.range[0] || id > world.range[1]) err(`goal ${g.id}`, `lesson ${id} isn't in ${world.name}`);
          if (covered.has(id)) err(`goal ${g.id}`, `lesson ${id} is already in goal ${covered.get(id)}`);
          covered.set(id, g.id);
        }
      }
      for (const l of lessons) if (!covered.has(l.id)) err(`lesson ${l.id}`, "isn't part of any \"I can…\" goal");
    }
  }

  // Spanish stories: valid, one per world at most, answers in range.
  if (books !== undefined) {
    const b = z.array(BookSchema).safeParse(books);
    if (!b.success) b.error.issues.forEach(i => err(`stories.json:${i.path.join(".")}`, i.message));
    else {
      dupes(b.data.map(x => x.id)).forEach(id => err("stories.json", `story id "${id}" is used twice`));
      for (const book of b.data) {
        if (!w.data.some(x => x.id === book.world)) err(`story ${book.id}`, `world ${book.world} doesn't exist`);
        book.questions.forEach((q, i) => { if (q.ans >= q.opts.length) err(`story ${book.id} question ${i + 1}`, "answer index is out of range"); });
      }
    }
  }

  if (chants !== undefined) {
    const c = z.array(ChantSchema).safeParse(chants);
    if (!c.success) c.error.issues.forEach(i => err(`chants.json:${i.path.join(".")}`, i.message));
    else {
      dupes(c.data.map(x => x.id)).forEach(id => err("chants.json", `chant id "${id}" is used twice`));
      for (const ch of c.data) if (!w.data.some(x => x.id === ch.world)) err(`chant ${ch.id}`, `world ${ch.world} doesn't exist`);
    }
  }

  return issues;
}
