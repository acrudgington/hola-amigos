import nodemailer, { type Transporter } from "nodemailer";
import { createHmac } from "node:crypto";
import { config } from "../config.js";
import { run } from "../db.js";

const transports = new Map<string, Transporter>();
function transport(url: string) {
  if (!url) return null;
  if (!transports.has(url)) transports.set(url, nodemailer.createTransport(url));
  return transports.get(url)!;
}

export function unsubscribeToken(email: string) {
  return createHmac("sha256", config.adminToken || "dev").update(email.toLowerCase()).digest("hex").slice(0, 24);
}
export function unsubscribeUrl(email: string) {
  return `${config.baseUrl}/u?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
}

type Send = {
  to: string; subject: string; text: string; kind: "outreach" | "support" | "inbound";
  threadKey?: string; leadId?: number; ticketId?: number; inReplyTo?: string;
};

/** Sends via the right mailbox and records the message. In dev (no SMTP) it just logs. */
export async function sendEmail(m: Send) {
  const outreach = m.kind === "outreach";
  const t = transport(outreach ? config.outreach.smtp : config.support.smtp);
  const from = outreach ? config.outreach.from : config.support.from;
  let text = m.text;
  const headers: Record<string, string> = {};
  if (outreach) {
    // PECR: identify the sender, give an address, and offer a simple opt-out on every message.
    const unsub = unsubscribeUrl(m.to);
    text += `\n\n--\n${config.outreach.postalAddress}\nNot for you? Reply "no thanks" or unsubscribe here: ${unsub}`;
    headers["List-Unsubscribe"] = `<${unsub}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  if (m.inReplyTo) { headers["In-Reply-To"] = m.inReplyTo; headers["References"] = m.inReplyTo; }

  let messageId = `dev-${Date.now()}`;
  if (t) {
    const info = await t.sendMail({ from, to: m.to, subject: m.subject, text, headers });
    messageId = info.messageId;
  } else {
    console.log(`[email:dev] to=${m.to} subject=${m.subject}\n${text}\n`);
  }
  run(
    "INSERT INTO messages (channel, direction, thread_key, lead_id, ticket_id, subject, body, meta) VALUES ('email','out',?,?,?,?,?,?)",
    m.threadKey ?? m.to.toLowerCase(), m.leadId ?? null, m.ticketId ?? null, m.subject, text,
    JSON.stringify({ outreach, messageId }),
  );
  return messageId;
}
