import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { run } from "../db.js";

const GRAPH = "https://graph.facebook.com/v21.0";

/** Verify Meta's X-Hub-Signature-256 header against the raw request body. */
export function verifySignature(rawBody: string, header: string | undefined): boolean {
  if (!config.whatsapp.appSecret) return true; // dev mode
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", config.whatsapp.appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type InboundWa = { from: string; name?: string; text: string; id: string; type: string };

/** Flatten a Cloud API webhook payload into simple inbound messages. */
export function parseWebhook(body: any): InboundWa[] {
  const out: InboundWa[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      const names = new Map<string, string>((v.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]));
      for (const m of v.messages ?? []) {
        const text =
          m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ??
          (m.type === "image" ? "[sent a photo]" : m.type === "audio" ? "[sent a voice note]" : `[${m.type} message]`);
        out.push({ from: m.from, name: names.get(m.from), text, id: m.id, type: m.type });
      }
    }
  }
  return out;
}

/** Free-form text reply. Only valid inside the 24h customer-service window opened by the customer. */
export async function sendWhatsApp(to: string, body: string, meta: Record<string, unknown> = {}) {
  if (config.whatsapp.token) {
    const res = await fetch(`${GRAPH}/${config.whatsapp.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.whatsapp.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed ${res.status}: ${await res.text()}`);
  } else {
    console.log(`[whatsapp:dev] to=${to}\n${body}\n`);
  }
  run("INSERT INTO messages (channel, direction, thread_key, body, meta) VALUES ('whatsapp','out',?,?,?)", to, body, JSON.stringify(meta));
}

/** Pre-approved template, for messages outside the 24h window (e.g. ticket updates, owner alerts). */
export async function sendWhatsAppTemplate(to: string, template: string, params: string[], lang = "en_GB") {
  if (!config.whatsapp.token) return console.log(`[whatsapp:dev:template] ${template} -> ${to}: ${params.join(" | ")}`);
  const res = await fetch(`${GRAPH}/${config.whatsapp.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.whatsapp.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to, type: "template",
      template: { name: template, language: { code: lang }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp template failed ${res.status}: ${await res.text()}`);
}
