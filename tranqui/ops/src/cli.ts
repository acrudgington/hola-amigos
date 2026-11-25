import { readFileSync } from "node:fs";
import { discover, enrich, enrichPending } from "./agents/prospector.js";
import { runOutreach } from "./agents/outreach.js";
import { planWeek, publishDue } from "./agents/social.js";
import { dailyDigest } from "./agents/digest.js";
import { handleInbound, quote } from "./agents/inbound.js";
import { handleSupport } from "./agents/support.js";
import { auditDomain } from "./channels/techAudit.js";
import { run } from "./db.js";

const [cmd, ...args] = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));

/** Minimal CSV parser (quoted fields supported) for legacy portal exports. */
function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...rest] = rows.filter((r) => r.some(Boolean));
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), r[i] ?? ""])));
}

const commands: Record<string, () => Promise<unknown>> = {
  discover: () => discover({ region: flags.region === "cb" ? "Costa Blanca" : "UK", ukLocation: flags.location, ukSector: flags.sector }),
  enrich: () => (flags.id ? enrich(Number(flags.id)) : enrichPending(Number(flags.limit ?? 10))),
  outreach: () => runOutreach(Number(flags.limit ?? 10)),
  "social-plan": () => planWeek(Number(flags.posts ?? 4)),
  "social-publish": () => publishDue(),
  digest: () => dailyDigest(),
  audit: () => auditDomain(flags.domain),
  quote: async () => quote(flags.plan ?? "tranqui", Number(flags.users ?? 5), flags.region === "cb" ? "Costa Blanca" : "UK", flags.annual === "true"),
  "chat-sales": () => handleInbound({ channel: "web", from: flags.from ?? "test@example.com", name: flags.name, text: flags.text ?? "Hi, how much is IT support for 6 people in Jávea?" }),
  "chat-support": () => handleSupport({ channel: "portal", requester: flags.from ?? "test@example.com", text: flags.text ?? "Outlook keeps asking for my password" }),
  /** Import tickets exported from the old patchingguy.com portal: CSV with email,name,subject,description,status,created,id */
  "import-tickets": async () => {
    const rows = parseCsv(readFileSync(flags.file, "utf8"));
    let n = 0;
    for (const r of rows) {
      const id = Number(run(
        "INSERT INTO tickets (requester, requester_name, channel, subject, status, external_ref, created_at, summary) VALUES (?,?,?,?,?,?,coalesce(nullif(?, ''), datetime('now')),?)",
        (r.email ?? "").toLowerCase(), r.name ?? null, "portal", r.subject || "(imported)", ["closed", "resolved"].includes((r.status ?? "").toLowerCase()) ? "closed" : "open",
        `patchingguy:${r.id ?? n}`, r.created ?? "", "imported from patchingguy.com").lastInsertRowid);
      if (r.description) run("INSERT INTO messages (channel, direction, thread_key, ticket_id, body) VALUES ('portal','in',?,?,?)", (r.email ?? "").toLowerCase(), id, r.description);
      n++;
    }
    return { imported: n };
  },
};

const fn = commands[cmd];
if (!fn) {
  console.log(`Usage: npm run agent -- <command> [--flags]\nCommands: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}
fn().then((r) => { console.log(typeof r === "string" ? r : JSON.stringify(r, null, 2)); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
