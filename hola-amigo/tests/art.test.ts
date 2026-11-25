import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../src/art/manifest.json";
import { projectEmoji } from "../src/art/scan.ts";

describe("3D illustrations", () => {
  it("every emoji in the course and app has an illustration (run npm run art:sync)", () => {
    const files = manifest as Record<string, string>;
    expect(projectEmoji().filter(e => !files[e])).toEqual([]);
  });
  it("every illustration file is in public/art", () => {
    for (const f of new Set(Object.values(manifest as Record<string, string>))) expect(existsSync(`public/art/${f}.webp`)).toBe(true);
  });
});
