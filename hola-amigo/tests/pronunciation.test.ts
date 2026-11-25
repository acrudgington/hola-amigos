import { describe, expect, it } from "vitest";
import { tipsFor } from "../src/domain/pronunciation.ts";
import { ALL_WORDS } from "../src/content/index.ts";

const ids = (es: string, max = 5) => tipsFor(es, max).map(t => t.id);

describe("pronunciation tips for grown-ups", () => {
  it("knows the Castilian th sound", () => {
    expect(ids("zapato")).toContain("theta");
    expect(ids("cinco")).toContain("theta");
    expect(ids("casa")).not.toContain("theta");
  });
  it("spots the jota, ñ, ll, rr and silent h", () => {
    expect(ids("jirafa")).toContain("jota");
    expect(ids("gente")).toContain("jota");
    expect(ids("gato")).not.toContain("jota");
    expect(ids("niño")).toContain("enye");
    expect(ids("llave")).toContain("ll");
    expect(ids("perro")).toContain("rr");
    expect(ids("rojo")).toContain("rr");
    expect(ids("pero")).not.toContain("rr");
    expect(ids("¡Hola!")).toContain("h");
    expect(ids("leche")).not.toContain("h");
  });
  it("silent u in qu and gu", () => {
    expect(ids("queso")).toContain("qu");
    expect(ids("guitarra")).toContain("gu");
  });
  it("falls back to vowels, and every course word gets at least one tip", () => {
    expect(ids("mamá")).toEqual(["stress"]);
    expect(ids("pato")).toEqual(["vowels"]);
    for (const w of ALL_WORDS) expect(tipsFor(w.es).length).toBeGreaterThan(0);
  });
});
