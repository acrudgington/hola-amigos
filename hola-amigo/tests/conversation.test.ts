import { describe, expect, it } from "vitest";
import { judgeReply, normalise } from "../src/domain/conversation.ts";
import type { Turn } from "../src/content/index.ts";

const name: Turn = {
  ask: "¿Cómo te llamas?", askEn: "What's your name?",
  answer: "Me llamo Mia.", answerEn: "My name is Mia.",
  keys: ["me llamo", "soy", "mi nombre es"],
  wrong: ["Tengo siete años.", "¡Adiós!"],
};
const age: Turn = {
  ask: "¿Cuántos años tienes?", askEn: "How old are you?",
  answer: "Tengo ocho años.", answerEn: "I'm eight.",
  keys: ["años", "tengo"], wrong: ["Me llamo Leo.", "Muy bien."],
};

describe("judging conversation replies", () => {
  it("normalises accents, case and punctuation", () => {
    expect(normalise("¡Sí, ÉL está aquí!")).toBe(" si el esta aqui ");
  });
  it("accepts any reply that uses a key phrase (personal answers)", () => {
    expect(judgeReply(["me llamo Tomás"], name)).toBe("good");
    expect(judgeReply(["soy Lucía"], name)).toBe("good");
    expect(judgeReply(["tengo diez años"], age)).toBe("good");
  });
  it("accepts a reply close to the model answer", () => {
    expect(judgeReply(["me yamo mia"], name)).not.toBe("try-again");
  });
  it("matches whole words only", () => {
    expect(judgeReply(["soya"], name)).toBe("try-again");
  });
  it("rejects a reply that doesn't fit the question", () => {
    expect(judgeReply(["adiós"], name)).toBe("try-again");
    expect(judgeReply([""], age)).toBe("try-again");
  });
  it("checks every alternative the recogniser heard", () => {
    expect(judgeReply(["meyamo", "me llamo Ana"], name)).toBe("good");
  });
});
