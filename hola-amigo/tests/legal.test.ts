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
  it("shows euro prices in each language's style", () => {
    const text = (lang: "en" | "es") => JSON.stringify(privacyNotice(lang, { cloud: true }));
    expect(text("en")).toContain("€4 a month or €40 a year");
    expect(text("es").replace(/\u00a0/g, " ")).toContain("4 € al mes o 40 € al año");
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
