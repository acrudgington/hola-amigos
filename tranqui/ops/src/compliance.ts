import { all, one, run } from "./db.js";

/**
 * Outbound marketing rules, encoded so the agents cannot break them.
 *
 * UK (PECR reg. 22): unsolicited marketing email to *corporate subscribers* (Ltd, LLP, PLC, public bodies)
 *   is allowed if you identify yourself, give a valid address, and offer a simple opt-out.
 *   Sole traders and (non-LLP) partnerships are *individual subscribers*: prior consent is required.
 *   Generic role addresses at corporates (info@, hello@) are fine; a named employee's work email is also
 *   corporate, but GDPR still applies: legitimate-interest assessment + Article 14 notice.
 * Spain (LSSI art. 21): unsolicited commercial email/SMS is prohibited without prior express consent,
 *   B2B included, unless there is an existing customer relationship for similar products.
 *   So the Costa Blanca pipeline never cold emails. It uses warm channels (see outreach agent).
 * WhatsApp: Meta policy requires opt-in before business-initiated messages. Never cold WhatsApp.
 */
export type Channel = "email" | "whatsapp" | "postal" | "phone_manual" | "linkedin_manual";

export const CORPORATE_TYPES = new Set(["ltd", "llp", "plc", "public_body"]);

export function allowedColdChannels(lead: { region: string; entity_type?: string | null }): Channel[] {
  if (lead.region === "UK") {
    if (lead.entity_type && CORPORATE_TYPES.has(lead.entity_type)) return ["email", "postal", "linkedin_manual"];
    // Sole traders/partnerships/unknown: no cold email. Physical mail is fine (check Mailing Preference Service).
    return ["postal", "linkedin_manual", "phone_manual"];
  }
  // Costa Blanca / Spain
  return ["postal", "linkedin_manual"];
}

export function isSuppressed(emailOrDomain: string): boolean {
  const v = emailOrDomain.toLowerCase();
  const domain = v.includes("@") ? v.split("@")[1] : v;
  return !!one("SELECT 1 FROM suppression WHERE value IN (?, ?)", v, domain);
}

export function suppress(value: string, reason: string) {
  run("INSERT OR IGNORE INTO suppression (value, reason) VALUES (?, ?)", value.toLowerCase(), reason);
  run("UPDATE leads SET status = 'suppressed', updated_at = datetime('now') WHERE lower(email) = ? OR domain = ?", value.toLowerCase(), value.toLowerCase());
}

const OPT_OUT = /\b(unsubscribe|remove me|stop|opt[ -]?out|not interested|no thanks|baja|darme de baja|no me interesa)\b/i;
export const looksLikeOptOut = (text: string) => OPT_OUT.test(text.slice(0, 400));

export function sentToday(): number {
  return Number(one("SELECT count(*) AS n FROM messages WHERE channel='email' AND direction='out' AND meta LIKE '%\"outreach\":true%' AND date(created_at)=date('now')")?.n ?? 0);
}

export function suppressionList() {
  return all("SELECT * FROM suppression ORDER BY created_at DESC");
}
