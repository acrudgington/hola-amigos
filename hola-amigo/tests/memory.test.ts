import { describe, expect, it } from "vitest";
import { buildMix, isTricky, mixSummary, nextDifficulty, strength, trickyWords, warmupWords } from "../src/domain/memory.ts";
import { normalizeProgress, recordWord } from "../src/domain/progress.ts";
import { LESSONS } from "../src/content/index.ts";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
const fresh = () => normalizeProgress(null);

describe("word memory", () => {
  it("recall practice tracks English→Spanish separately", () => {
    let p = fresh();
    p = recordWord(p, "Hola", "Hello", true, NOW);                  // recognise
    p = recordWord(p, "Hola", "Hello", true, NOW, "recall");
    expect(p.wordMemory.Hola.recall).toBe(1);
    expect(p.wordMemory.Hola.box).toBe(2);                          // recall success also proves recognition
    p = recordWord(p, "Hola", "Hello", false, NOW, "recall");
    expect(p.wordMemory.Hola.recall).toBe(0);
    expect(p.wordMemory.Hola.box).toBe(2);                          // a recall miss doesn't wipe recognition
    expect(p.wordMemory.Hola.wrong).toBe(1);
  });

  it("strength grows with the boxes and fades when overdue", () => {
    const w = { box: 4, seen: 4, en: "x", last: NOW };
    expect(strength(w, NOW)).toBeCloseTo(0.8);
    expect(strength(w, NOW + 60 * DAY)).toBeLessThan(0.5);
    expect(strength({ box: 1, seen: 1, en: "x", last: NOW }, NOW)).toBeLessThan(strength(w, NOW));
  });

  it("spots tricky words and lists the weakest for parents", () => {
    let p = fresh();
    for (let i = 0; i < 4; i++) p = recordWord(p, "Rojo", "Red", i % 2 === 0, NOW);   // right, wrong, right, wrong
    for (let i = 0; i < 4; i++) p = recordWord(p, "Azul", "Blue", true, NOW);
    expect(isTricky(p.wordMemory.Rojo)).toBe(true);
    expect(isTricky(p.wordMemory.Azul)).toBe(false);
    expect(trickyWords(p, 6, NOW).map(w => w.es)).toEqual(["Rojo"]);
  });
});

describe("Sol's mix", () => {
  it("puts tricky, due and challenge words in, with fewer choices for tricky ones", () => {
    let p = fresh();
    p.stars = { 1: 3, 2: 3, 3: 3 };
    for (const w of LESSONS[0].words) for (let i = 0; i < 4; i++) p = recordWord(p, w.es, w.en, true, NOW - 30 * DAY);   // strong but now due
    for (let i = 0; i < 4; i++) p = recordWord(p, "Uno", "One", i % 2 === 0, NOW);                                      // tricky
    const mix = buildMix(p, { now: NOW });
    const sum = mixSummary(mix);
    expect(mix).toHaveLength(10);
    expect(new Set(mix.map(m => m.es)).size).toBe(10);
    expect(sum.tricky).toBe(1);
    expect(mix.find(m => m.es === "Uno")?.choices).toBe(3);
    expect(sum.due).toBeGreaterThan(0);
    expect(sum.challenge).toBeGreaterThan(0);
    expect(mix.filter(m => m.mode === "recall").every(m => m.reason === "challenge")).toBe(true);
  });

  it("is empty for a brand-new learner and listens only when audio works", () => {
    expect(buildMix(fresh(), { now: NOW })).toEqual([]);
    const p = fresh(); p.stars = { 1: 3 };
    expect(buildMix(p, { now: NOW, canListen: false }).some(m => m.mode === "listen")).toBe(false);
  });

  it("warm-ups pick the weakest earlier words", () => {
    let p = fresh();
    const earlier = LESSONS[0].words;
    for (const w of earlier) for (let i = 0; i < 5; i++) p = recordWord(p, w.es, w.en, true, NOW);
    p = recordWord(p, earlier[3].es, earlier[3].en, false, NOW);
    expect(warmupWords(p, earlier, 3, NOW)[0].es).toBe(earlier[3].es);
  });
});

describe("in-game difficulty", () => {
  it("eases off after two misses and steps up after four in a row", () => {
    expect(nextDifficulty([])).toBe("normal");
    expect(nextDifficulty([true, false, false])).toBe("easier");
    expect(nextDifficulty([false, true, true, true, true])).toBe("harder");
    expect(nextDifficulty([true, true, false, true])).toBe("normal");
  });
});
