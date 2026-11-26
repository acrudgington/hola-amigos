import { describe, expect, it } from "vitest";
import { PACKS, packById } from "../src/content/index.ts";
import { activeSeason, isPackActive, isPackLessonOpen, packProgress, visiblePacks } from "../src/domain/packs.ts";
import { awardStars, normalizeProgress } from "../src/domain/progress.ts";

const d = (s: string) => new Date(`${s}T12:00:00`);

describe("packs", () => {
  it("has the school kit, the two seasonal packs and the parents' course", () => {
    expect(PACKS.map(p => p.id)).toEqual(expect.arrayContaining(["school", "halloween", "christmas", "parents"]));
    expect(visiblePacks("adult").map(p => p.id)).toEqual(["parents"]);
    expect(visiblePacks("child").map(p => p.id)).not.toContain("parents");
  });

  it("opens Halloween from 1 October to 2 November", () => {
    const h = packById("halloween")!;
    expect(isPackActive(h, d("2026-09-30"), null)).toBe(false);
    expect(isPackActive(h, d("2026-10-01"), null)).toBe(true);
    expect(isPackActive(h, d("2026-11-02"), null)).toBe(true);
    expect(isPackActive(h, d("2026-11-03"), null)).toBe(false);
  });

  it("opens Christmas from 1 December to 6 January, across the new year", () => {
    const c = packById("christmas")!;
    expect(isPackActive(c, d("2026-11-30"), null)).toBe(false);
    expect(isPackActive(c, d("2026-12-01"), null)).toBe(true);
    expect(isPackActive(c, d("2027-01-06"), null)).toBe(true);
    expect(isPackActive(c, d("2027-01-07"), null)).toBe(false);
  });

  it("shows the right season and keeps the school kit all year", () => {
    expect(activeSeason(d("2026-10-15"))?.id).toBe("halloween");
    expect(activeSeason(d("2026-12-24"))?.id).toBe("christmas");
    expect(activeSeason(d("2026-06-01"))).toBeUndefined();
    expect(visiblePacks("child", d("2026-06-01")).map(p => p.id)).toEqual(["school"]);
  });

  it("stores pack stars apart from the course and unlocks lessons in order", () => {
    const pack = packById("school")!;
    let p = normalizeProgress(null);
    expect(isPackLessonOpen(p, pack, 1)).toBe(pack.sequential ? false : true);
    p = awardStars(p, pack.lessons[0].id, 3);
    expect(p.packStars[pack.lessons[0].id]).toBe(3);
    expect(isPackLessonOpen(p, pack, 1)).toBe(true);
    expect(packProgress(p, pack)).toMatchObject({ done: 1, stars: 3 });
  });
});
