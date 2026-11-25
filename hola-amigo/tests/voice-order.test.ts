// The order lines are spoken in when an activity opens (no browser: the player
// falls back to an instant "device voice", so we can watch the order).
import { describe, expect, it } from "vitest";
import { voice } from "../src/audio/player.ts";

const settle = () => new Promise(r => setTimeout(r, 60));

describe("voice ordering", () => {
  it("a word queued before the instructions plays after them, not cut off", async () => {
    const heard: string[] = [];
    voice.expectIntro();
    voice.spanish("Hola", { mode: "queue", onEnd: () => heard.push("Hola") });          // first word, at 350ms
    voice.narrate("Meet the new words!", { mode: "lead", onEnd: () => heard.push("instructions") }); // at 450ms
    await settle();
    expect(heard).toEqual(["instructions", "Hola"]);
  });

  it("with spoken guidance off (no instructions), the word still plays", async () => {
    const heard: string[] = [];
    voice.expectIntro(20);
    voice.spanish("Hola", { mode: "queue", onEnd: () => heard.push("Hola") });
    await settle();
    expect(heard).toEqual(["Hola"]);
  });

  it("leaving the activity before its instructions drops the waiting word", async () => {
    const heard: string[] = [];
    voice.expectIntro();
    voice.spanish("Hola", { mode: "queue", onEnd: () => heard.push("Hola") });
    voice.cancelIntro();
    await settle();
    expect(heard).toEqual([]);
  });
});
