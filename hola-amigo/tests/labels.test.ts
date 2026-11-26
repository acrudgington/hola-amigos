import { describe, expect, it } from "vitest";
import { ALL_LABELS, LABEL_ROOMS } from "../src/content/labels.ts";

describe("printable home labels", () => {
  it("has several rooms, each with labels", () => {
    expect(LABEL_ROOMS.length).toBeGreaterThanOrEqual(5);
    for (const r of LABEL_ROOMS) expect(r.labels.length).toBeGreaterThanOrEqual(6);
  });
  it("teaches every noun with its article, once", () => {
    for (const l of ALL_LABELS) expect(l.es).toMatch(/^(el|la|los|las) /);
    const es = ALL_LABELS.map(l => l.es);
    expect(new Set(es).size).toBe(es.length);
  });
  it("gives every label English, a pronunciation guide and a picture", () => {
    for (const l of ALL_LABELS) { expect(l.en).toMatch(/^the /); expect(l.say.length).toBeGreaterThan(1); expect(l.emoji).not.toBe(""); }
  });
});
