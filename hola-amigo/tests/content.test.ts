import { describe, expect, test } from "vitest";
import { checkCourse } from "../src/content/schema.ts";
import { ALL_WORDS, LESSONS, MILESTONES, RAW_CONTENT, WORLDS, isMilestone, lessonsInWorld, worldOf } from "../src/content/index.ts";
import { buildJourney } from "../src/lib/journey.ts";
import { buildOptions, shuffle } from "../src/lib/utils.ts";
import { similarity } from "../src/lib/speech.ts";

describe("course content", () => {
  test("passes every schema and teaching rule", () => {
    const errors = checkCourse(RAW_CONTENT.worlds, RAW_CONTENT.lessonFiles, RAW_CONTENT.surprises, RAW_CONTENT.units, RAW_CONTENT.books, RAW_CONTENT.chants).filter(i => i.level === "error");
    expect(errors).toEqual([]);
  });

  test("has 200 lessons across 22 worlds with 21 milestones", () => {
    expect(LESSONS).toHaveLength(200);
    expect(WORLDS).toHaveLength(22);
    expect(MILESTONES).toEqual([16, 24, 32, 40, 50, 60, 68, 76, 84, 92, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]);
    expect(WORLDS.reduce((n, w) => n + lessonsInWorld(w).length, 0)).toBe(200);
    expect(worldOf(33)?.name).toBe("Plaza del Pueblo");
    expect(ALL_WORDS).toHaveLength(1412);
  });

  test("the checker catches broken content", () => {
    type Broken = { lessons: { story: { qs: { ans: number }[] }; sentences: { shuffle: string[] }[] }[] }[];
    const broken = structuredClone(RAW_CONTENT.lessonFiles) as Broken;
    const lesson = broken.flatMap(f => f.lessons).find(l => l.sentences.length)!;
    lesson.story.qs[0].ans = 9;
    lesson.sentences[0].shuffle.push("extra");
    const errors = checkCourse(RAW_CONTENT.worlds, broken, RAW_CONTENT.surprises).filter(i => i.level === "error");
    expect(errors.map(e => e.message)).toEqual(expect.arrayContaining(["answer index is out of range", "word tiles don't match the correct answer"]));
  });
});

describe("lesson journeys", () => {
  test("always have content; milestones are boss battles; lesson 1 never warms up", () => {
    for (const l of LESSONS) {
      const j = buildJourney(l);
      expect(j.length).toBeGreaterThanOrEqual(3);
      if (isMilestone(l.id)) expect(j).toContain("boss");
      if (l.id === 1) expect(j).not.toContain("warmup");
    }
  });
});

describe("helpers", () => {
  test("multiple-choice options never repeat an answer", () => {
    const pool = [...LESSONS[0].words, { es: "X", en: "Hello", emoji: "❓", say: "x" }];
    for (let i = 0; i < 50; i++) {
      const opts = buildOptions(pool[0], pool);
      expect(new Set(opts.map(o => o.en)).size).toBe(opts.length);
      expect(opts).toContain(pool[0]);
    }
    expect(shuffle([1, 2, 3]).sort()).toEqual([1, 2, 3]);
  });

  test("speech matching ignores accents and punctuation", () => {
    expect(similarity("¿Qué tal?", "que tal")).toBe(1);
    expect(similarity("buenos dias", "Buenos días")).toBe(1);
    expect(similarity("hola", "adiós")).toBeLessThan(0.5);
  });
});
