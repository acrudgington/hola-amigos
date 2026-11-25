import { z } from "zod/v4";
import { all, one, run, logEvent } from "../db.js";
import { runAgent, extractJson, webFetch, webSearch } from "../llm.js";
import { searchPlaces, searchCompaniesHouse, lookupEntityType, type RawProspect } from "../channels/prospectSources.js";
import { auditDomain } from "../channels/techAudit.js";
import { isSuppressed } from "../compliance.js";

/** Where we hunt. Tune freely: the agent learns nothing from these, they are just search seeds. */
export const COSTA_BLANCA_TOWNS = [
  "Jávea", "Dénia", "Moraira", "Calpe", "Altea", "Albir", "Benidorm", "La Nucía", "Alfaz del Pi",
  "Alicante", "Torrevieja", "Orihuela Costa", "Ciudad Quesada", "Guardamar del Segura", "Villamartín",
];
export const COSTA_BLANCA_NICHES = [
  "English estate agent", "British owned bar", "English speaking dentist", "British accountant gestoría",
  "English speaking lawyer", "British removals company", "English pool maintenance", "British builder",
  "English speaking vet", "British insurance broker", "English beauty salon", "British property management",
];
/** UK SIC codes with lots of 2-20 person firms that live on email and laptops. */
export const UK_SIC_SEEDS: Record<string, string[]> = {
  "accountancy": ["69201", "69202", "69203"],
  "legal": ["69102", "69109"],
  "estate-agents": ["68310"],
  "architects": ["71111"],
  "dental": ["86230"],
  "recruitment": ["78109"],
  "marketing": ["73110", "70229"],
  "insurance-brokers": ["66220"],
};

function domainOf(url?: string) {
  if (!url) return null;
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch { return null; }
}

function insert(p: RawProspect): boolean {
  const domain = domainOf(p.website);
  if (domain && (isSuppressed(domain) || one("SELECT 1 FROM leads WHERE domain = ?", domain))) return false;
  const res = run(
    `INSERT OR IGNORE INTO leads (region, name, website, domain, phone, address, category, source, source_ref, entity_type)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    p.region, p.name, p.website ?? null, domain, p.phone ?? null, p.address ?? null, p.category ?? null,
    p.source, p.sourceRef, p.entityType ?? "unknown",
  );
  return res.changes > 0;
}

/** Step 1: discovery. Pulls candidates from official APIs only. */
export async function discover(opts: { region: "UK" | "Costa Blanca"; limit?: number; ukLocation?: string; ukSector?: string }) {
  let added = 0;
  if (opts.region === "Costa Blanca") {
    const town = COSTA_BLANCA_TOWNS[Math.floor(Math.random() * COSTA_BLANCA_TOWNS.length)];
    for (const niche of [...COSTA_BLANCA_NICHES].sort(() => Math.random() - 0.5).slice(0, 4)) {
      const { prospects } = await searchPlaces(`${niche} in ${town}, Alicante, Spain`, "Costa Blanca");
      for (const p of prospects) if (p.website && insert(p)) added++;
    }
  } else {
    const location = opts.ukLocation ?? "Surrey";
    const sector = opts.ukSector ?? Object.keys(UK_SIC_SEEDS)[Math.floor(Math.random() * Object.keys(UK_SIC_SEEDS).length)];
    const companies = await searchCompaniesHouse({ location, sicCodes: UK_SIC_SEEDS[sector], size: opts.limit ?? 40 });
    for (const c of companies) if (insert(c)) added++;
    // Also Places, which gives websites; entity type is resolved during enrichment.
    const { prospects } = await searchPlaces(`${sector.replace("-", " ")} in ${location}, UK`, "UK");
    for (const p of prospects) if (p.website && insert(p)) added++;
  }
  logEvent("prospector", "discover", { region: opts.region, added });
  return added;
}

const Enrichment = z.object({
  website: z.string().nullable(),
  contact_email: z.string().nullable().describe("Only an address published on the business's own website. Never guess."),
  contact_name: z.string().nullable(),
  contact_role: z.string().nullable(),
  entity_type: z.enum(["ltd", "llp", "plc", "sole_trader", "partnership", "sl", "autonomo", "unknown"]),
  british_run: z.number().min(0).max(1),
  staff_estimate: z.string().nullable(),
  fit_score: z.number().int().min(0).max(100),
  summary: z.string(),
  hooks: z.array(z.string()).max(4).describe("Specific, verifiable, friendly observations to personalise outreach"),
});
export type Enrichment = z.infer<typeof Enrichment>;

const SYSTEM = `You are Tranqui's prospect researcher. Tranqui sells subscription IT support to small businesses (roughly 2-30 staff).
For the UK we target any small business; for the Costa Blanca we target businesses run by British (or English-speaking) owners.

For each business you get: what we already know plus a passive DNS/website audit. Read the business's own website with web_fetch
(homepage, then contact/about pages if linked). If there is no website, use web_search once to find it.

Rules:
- Only report an email address that is published on the business's own site. Never construct or guess one (no "firstname@").
- Prefer a generic business address (info@, hello@, office@) unless a named owner/manager address is published.
- British-run confidence: English-language site, British names of owners, UK phone numbers, "British-owned" claims, expat-focused services.
- entity_type: for UK use the legal suffix on the site/footer (Ltd/LLP/PLC). If none, sole_trader or unknown. For Spain use sl/autonomo/unknown.
- fit_score: 0-100. High for: 3-30 staff, office-based, client data (accountants, lawyers, estate agents, clinics), visible IT pain
  (no DMARC, old WordPress, webmail address, no HTTPS). Low for: chains/franchises, big companies, IT companies (competitors), closed businesses.
- Hooks must be true, specific and kind. Never alarmist, never insult their website.

End your reply with a single \`\`\`json block matching:
{"website":string|null,"contact_email":string|null,"contact_name":string|null,"contact_role":string|null,
"entity_type":"ltd"|"llp"|"plc"|"sole_trader"|"partnership"|"sl"|"autonomo"|"unknown","british_run":0..1,
"staff_estimate":string|null,"fit_score":0..100,"summary":string,"hooks":string[]}`;

/** Step 2: enrichment. Audit DNS, read the website, score fit and british-run likelihood. */
export async function enrich(leadId: number) {
  const lead = one("SELECT * FROM leads WHERE id = ?", leadId);
  if (!lead) throw new Error(`lead ${leadId} not found`);
  const audit = lead.domain ? await auditDomain(lead.domain) : null;
  const chEntity = lead.region === "UK" && lead.entity_type === "unknown" ? await lookupEntityType(lead.name) : lead.entity_type;

  const { text } = await runAgent({
    agent: "prospector",
    system: SYSTEM,
    effort: "low",
    tools: [webFetch, webSearch],
    messages: [{
      role: "user",
      content: `Business: ${lead.name}
Region: ${lead.region}
Website: ${lead.website ?? "unknown"}
Address: ${lead.address ?? "unknown"}
Category: ${lead.category ?? "unknown"}
Companies House entity type: ${chEntity}
Passive tech audit: ${audit ? JSON.stringify(audit) : "no domain"}`,
    }],
  });
  const e = Enrichment.parse(extractJson(text));
  const entity = chEntity && chEntity !== "unknown" ? chEntity : e.entity_type;
  const domain = domainOf(e.website ?? lead.website) ?? lead.domain;
  const status = e.contact_email && isSuppressed(e.contact_email) ? "suppressed" : "enriched";
  run(
    `UPDATE leads SET website=?, domain=?, email=?, contact_name=?, entity_type=?, british_run=?, fit_score=?, insights=?, status=?,
     next_action_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
    e.website ?? lead.website, domain, e.contact_email, e.contact_name, entity, e.british_run, e.fit_score,
    JSON.stringify({ audit, ...e }), status, leadId,
  );
  logEvent("prospector", "enriched", { leadId, fit: e.fit_score, british: e.british_run });
  return e;
}

/** Batch job used by the scheduler. */
export async function enrichPending(limit = 15) {
  const rows = all("SELECT id FROM leads WHERE status = 'new' ORDER BY created_at LIMIT ?", limit);
  for (const r of rows) {
    try { await enrich(r.id); } catch (err) {
      run("UPDATE leads SET status='lost', insights=?, updated_at=datetime('now') WHERE id=?", JSON.stringify({ error: String(err) }), r.id);
    }
  }
  return rows.length;
}
