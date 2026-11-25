import { resolveTxt, resolveMx, lookup } from "node:dns/promises";

export type TechAudit = {
  domain: string;
  mx: string[];
  mailProvider: "microsoft365" | "google" | "other" | "none";
  spf: string | null;
  dmarc: string | null;
  dmarcPolicy: "none" | "quarantine" | "reject" | "missing";
  https: boolean | null;
  server?: string | null;
  generator?: string | null;   // e.g. WordPress 5.8
  freeMailContact?: boolean;   // business uses gmail/hotmail address publicly
  dnsOk: boolean;              // false = lookups failed, DNS findings withheld
  findings: string[];          // plain-English, non-alarmist observations usable in outreach
};

/** ENODATA/ENOTFOUND = record genuinely absent. Anything else (timeout, SERVFAIL, refused) = unknown. */
const ABSENT = new Set(["ENODATA", "ENOTFOUND"]);
class DnsUnknown extends Error {}
const txt = async (name: string) => {
  try { return (await resolveTxt(name)).map((r) => r.join("")); }
  catch (e: any) { if (ABSENT.has(e?.code)) return []; throw new DnsUnknown(e?.code ?? "dns error"); }
};

/**
 * Passive, public-information checks only (DNS records + homepage headers). No scanning, no probing.
 * These give genuinely useful, personalised hooks for outreach ("your domain has no DMARC record").
 */
export async function auditDomain(domain: string, contactEmail?: string): Promise<TechAudit> {
  const d = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  const findings: string[] = [];
  let mx: string[] = [];
  // Sanity check: a live business domain must resolve. If it doesn't, our resolver (or the domain) is broken,
  // so we refuse to report "missing record" findings that could be false.
  let dnsOk = await lookup(d).then(() => true, () => false);
  try { mx = (await resolveMx(d)).sort((a, b) => a.priority - b.priority).map((m) => m.exchange.toLowerCase()); }
  catch (e: any) { if (!ABSENT.has(e?.code)) dnsOk = false; }
  const mailProvider = mx.length === 0 ? "none"
    : mx.some((m) => m.includes("outlook.com") || m.includes("protection.outlook")) ? "microsoft365"
    : mx.some((m) => m.includes("google.com") || m.includes("googlemail")) ? "google" : "other";

  let spf: string | null = null, dmarc: string | null = null;
  try {
    spf = (await txt(d)).find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null;
    dmarc = (await txt(`_dmarc.${d}`)).find((r) => r.toLowerCase().startsWith("v=dmarc1")) ?? null;
  } catch (e) { if (e instanceof DnsUnknown) dnsOk = false; else throw e; }
  const p = dmarc?.match(/;\s*p=(\w+)/i)?.[1]?.toLowerCase();
  const dmarcPolicy = !dmarc ? "missing" : p === "reject" ? "reject" : p === "quarantine" ? "quarantine" : "none";

  if (!dnsOk) findings.length = 0; // never make claims from a failed lookup
  if (dnsOk && mx.length && !spf) findings.push("No SPF record, so emails from the domain are more likely to land in spam.");
  if (!dnsOk) { /* unknown: say nothing */ }
  else if (dmarcPolicy === "missing") findings.push("No DMARC record, which means anyone can send email pretending to be the business.");
  else if (dmarcPolicy === "none") findings.push("DMARC is in monitor-only mode (p=none), so spoofed emails are still delivered.");
  if (dnsOk && mailProvider === "other") findings.push(`Email is hosted with a smaller provider (${mx[0]}). Worth checking backups and security.`);

  let https: boolean | null = null, server: string | null = null, generator: string | null = null;
  try {
    const res = await fetch(`https://${d}`, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    https = res.url.startsWith("https://");
    server = res.headers.get("server");
    const html = (await res.text()).slice(0, 200_000);
    generator = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1] ?? null;
    const wp = generator?.match(/WordPress\s+(\d+)\.(\d+)/i);
    if (wp && Number(wp[1]) < 6) findings.push(`The website runs an old version of WordPress (${wp[1]}.${wp[2]}), which is a common target for hackers.`);
  } catch {
    try {
      const res = await fetch(`http://${d}`, { redirect: "follow", signal: AbortSignal.timeout(8000) });
      https = res.url.startsWith("https://");
      if (!https) findings.push("The website doesn't use HTTPS, so browsers show it as 'Not secure'.");
    } catch { /* unreachable */ }
  }
  const freeMailContact = !!contactEmail && /@(gmail|hotmail|outlook|yahoo|icloud|live|btinternet)\./i.test(contactEmail);
  if (freeMailContact) findings.push("The business uses a personal webmail address publicly. A branded mailbox looks more professional and is easier to secure.");

  return { domain: d, mx, mailProvider, spf, dmarc, dmarcPolicy: dnsOk ? dmarcPolicy : "missing", dnsOk, https, server, generator, freeMailContact, findings };
}
