import { describe, expect, test } from "vitest";
import { clipId, segmentMixed, splitSentences } from "../src/audio/text.ts";
import { collectClips, narration, spanish } from "../src/audio/catalog.ts";
import { BOSS_HIT, DONE_LINES, INSTRUCTIONS, LEVEL_UP_LINE, PRAISE, REMEMBERED, REVIEW_INSTRUCTION } from "../src/audio/lines.ts";
import { ALL_WORDS, LESSONS } from "../src/content/index.ts";
import { REACTION_LINES } from "../src/lib/reactions.ts";
import { AUDIO } from "../src/config.ts";

const roles = (t: string) => segmentMixed(t).map(s => `${s.role}:${s.text}`);

describe("mixed English/Spanish narration", () => {
  test("quoted Spanish and exclamations go to the Castilian voice", () => {
    expect(roles("Every morning, Sol wakes up and says: '¡Buenos días!' to the sky.")).toEqual([
      "en:Every morning, Sol wakes up and says", "es:¡Buenos días!", "en:to the sky.",
    ]);
    expect(roles("Three in a row! ¡Vamos!")).toEqual(["en:Three in a row!", "es:¡Vamos!"]);
  });

  test("loose vocabulary words, with their articles, are said in Spanish", () => {
    expect(roles("He sees un perro, un gato, and un caballo.")).toEqual(["en:He sees", "es:un perro, un gato", "en:and", "es:un caballo."]);
    expect(roles("She paints the sky azul and the sun amarillo.")).toEqual(["en:She paints the sky", "es:azul", "en:and the sun", "es:amarillo."]);
  });

  test("plain English stays English; emoji are never spoken", () => {
    expect(roles("Sol is a little sun who lives in Spain.")).toEqual(["en:Sol is a little sun who lives in Spain."]);
    expect(roles("Beautiful work! ✨")).toEqual(["en:Beautiful work!"]);
  });

  test("speakers get their own voices", () => {
    expect(segmentMixed("¡Increíble! You're on fire! 🔥", "sol").map(s => s.role)).toEqual(["sol-es", "sol-en"]);
    expect(segmentMixed("¡Casi! Try the next one.", "luna").map(s => s.role)).toEqual(["luna-es", "luna-en"]);
  });

  test("sentences split at their ends, not inside quotes", () => {
    expect(splitSentences("He says '¡Hola! ¿Qué tal?' to her. Then he goes.")).toEqual(["He says '¡Hola! ¿Qué tal?' to her.", "Then he goes."]);
  });
});

describe("voice clips", () => {
  test("ids are stable and depend on voice and text", () => {
    expect(clipId("es", "Hola")).toBe(clipId("es", "  Hola "));
    expect(clipId("es", "Hola")).not.toBe(clipId("en", "Hola"));
    expect(clipId("es", "Hola")).not.toBe(clipId("es", "Adiós"));
  });

  test("the catalogue covers every line the app says", () => {
    const ids = new Set(collectClips().map(c => c.id));
    const covered = (segs: { role: Parameters<typeof clipId>[0]; text: string }[]) => segs.every(s => ids.has(clipId(s.role, s.text)));
    expect(ALL_WORDS.every(w => covered(spanish(w.es)))).toBe(true);
    for (const l of LESSONS) {
      expect(covered(spanish(l.phrase.es))).toBe(true);
      expect(covered(narration(l.funFact))).toBe(true);
      l.sentences.forEach(s => expect(covered(spanish(s.correct.join(" ")))).toBe(true));
      l.story.paras.flatMap(splitSentences).forEach(s => expect(covered(narration(s))).toBe(true));
      l.story.qs.forEach(q => expect(covered(narration(q.q))).toBe(true));
    }
    [...Object.values(INSTRUCTIONS), REVIEW_INSTRUCTION].forEach(t => expect(covered(narration(t))).toBe(true));
    [...PRAISE, BOSS_HIT, REMEMBERED, LEVEL_UP_LINE, ...Object.values(DONE_LINES)].forEach(t => expect(covered(narration(t, "sol"))).toBe(true));
    REACTION_LINES.forEach(r => expect(covered(narration(r.text, r.who))).toBe(true));
  });

  test("every voice role is Castilian Spanish or British English", () => {
    for (const [role, v] of Object.entries(AUDIO.voices)) expect(v.languageCode).toBe(role.endsWith("es") ? "es-ES" : "en-GB");
  });
});
