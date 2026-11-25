import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

export type Region = "UK" | "Costa Blanca";
export type Money = { GBP: number; EUR: number };
export type Plan = {
  id: string; name: string; tagline: string; price: Money; unit: string;
  minUsers: number; response: string; features: string[]; humanSupport: string; featured?: boolean;
};
export type Catalog = {
  brand: { name: string; tagline: string; taglineEs: string; promise: string; contact: Record<string, string>; domains: Record<string, unknown> };
  services: { id: string; name: string; summary: string; automation: string; examples: string[] }[];
  plans: Plan[];
  payg: { name: string; price: Money; unit: string; notes: string };
  addons: { id: string; name: string; price: Money; unit: string }[];
  terms: Record<string, string>;
};

/** Single source of truth shared with the website (../shared/catalog.json). */
export const catalog: Catalog = JSON.parse(
  readFileSync(path.join(here, "..", "..", "shared", "catalog.json"), "utf8"),
);

export function priceFor(m: Money, region: Region) {
  return region === "UK" ? `£${m.GBP}` : `€${m.EUR}`;
}

/** Compact, stable text version of the catalogue for agent system prompts (cache-friendly). */
export function catalogForPrompt(): string {
  const plans = catalog.plans
    .map((p) => `- ${p.name} (${p.tagline}): £${p.price.GBP} / €${p.price.EUR} ${p.unit}, min ${p.minUsers} users, response ${p.response}. ${p.features.join("; ")}.`)
    .join("\n");
  const addons = catalog.addons
    .filter((a) => a.price.GBP || a.price.EUR)
    .map((a) => `- ${a.name}: ${a.price.GBP ? `£${a.price.GBP}` : "n/a UK"} / ${a.price.EUR ? `€${a.price.EUR}` : "n/a ES"} ${a.unit}`)
    .join("\n");
  const services = catalog.services.map((s) => `- ${s.name} [automation: ${s.automation}]: ${s.summary}`).join("\n");
  return [
    `# ${catalog.brand.name}: ${catalog.brand.promise}`,
    `## Services\n${services}`,
    `## Plans (prices exclude VAT/IVA)\n${plans}`,
    `## Pay-as-you-go\n- ${catalog.payg.name}: £${catalog.payg.price.GBP} / €${catalog.payg.price.EUR} ${catalog.payg.unit}. ${catalog.payg.notes}`,
    `## Add-ons\n${addons}`,
    `## Terms\n${Object.entries(catalog.terms).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`,
  ].join("\n\n");
}
