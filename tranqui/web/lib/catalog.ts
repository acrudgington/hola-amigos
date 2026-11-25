import raw from "../../shared/catalog.json";

export type Region = "UK" | "Costa Blanca";
export const catalog = raw;
export type Plan = (typeof raw.plans)[number] & { featured?: boolean };

export const OPS_URL = process.env.NEXT_PUBLIC_OPS_URL ?? "http://localhost:8787";
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP ?? "34600000000";

export function money(p: { GBP: number; EUR: number }, region: Region) {
  return region === "UK" ? `£${p.GBP}` : `€${p.EUR}`;
}
