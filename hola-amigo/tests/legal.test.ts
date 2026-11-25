import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { legalFiles } from "../src/legal/files.ts";
import { parseBold, privacyNotice } from "../src/legal/privacyNotice.ts";

describe("privacy notice", () => {
  it("English and Spanish versions have the same structure", () => {
    for (const cloud of [true, false]) {
      const shape = (lang: "en" | "es") => privacyNotice(lang, { cloud }).sections.map(s => s.blocks.map(b => typeof b === "string" ? "p" : b.length));
      expect(shape("es")).toEqual(shape("en"));
    }
  });
  it("states the €20 yearly price in each language's style", () => {
    const text = (lang: "en" | "es") => JSON.stringify(privacyNotice(lang, { cloud: true })).replace(/\u00a0/g, " ");
    expect(text("en")).toContain("€20 a year");
    expect(text("es")).toContain("20 € al año");
    expect(text("en")).not.toMatch(/a month/);
  });
  it("has balanced bold markup", () => {
    for (const lang of ["en", "es"] as const) {
      for (const s of privacyNotice(lang, { cloud: true }).sections)
        for (const b of s.blocks) for (const t of [b].flat())
          expect(parseBold(t).map(p => p.text).join("")).not.toContain("**");
    }
  });
  it("review copies in legal/ are up to date (run npm run legal:export)", () => {
    for (const [path, text] of Object.entries(legalFiles())) expect(readFileSync(path, "utf8")).toBe(text);
  });
});
