import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { config } from "./config.js";
import { all, one, run } from "./db.js";
import { parseWebhook, verifySignature } from "./channels/whatsapp.js";
import { unsubscribeToken } from "./channels/email.js";
import { MEDIA_DIR } from "./channels/render.js";
import { auditDomain } from "./channels/techAudit.js";
import { notifyOwner } from "./notify.js";
import { sendEmail } from "./channels/email.js";
import { suppress } from "./compliance.js";
import { handleInbound } from "./agents/inbound.js";
import { handleSupport } from "./agents/support.js";
import { sendOutreachEmail } from "./agents/outreach.js";
import { pendingApprovals, getApproval, decide } from "./approvals.js";
import { startScheduler } from "./scheduler.js";

const app = new Hono();
app.use("/api/*", cors({ origin: (o) => (o?.endsWith("tranqui.tech") || o?.startsWith("http://localhost") ? o : null) }));

const portalToken = (id: number) => createHmac("sha256", config.adminToken || "dev").update(`ticket:${id}`).digest("hex").slice(0, 20);
const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

app.get("/health", (c) => c.json({ ok: true, mode: config.outboundMode }));
app.use("/media/*", serveStatic({ root: path.relative(process.cwd(), path.dirname(MEDIA_DIR)) }));

/* ---------- WhatsApp (Meta Cloud API) ---------- */
app.get("/webhooks/whatsapp", (c) => {
  const q = c.req.query();
  if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === config.whatsapp.verifyToken) return c.text(q["hub.challenge"] ?? "");
  return c.text("forbidden", 403);
});
app.post("/webhooks/whatsapp", async (c) => {
  const raw = await c.req.text();
  if (!verifySignature(raw, c.req.header("x-hub-signature-256"))) return c.text("bad signature", 401);
  const messages = parseWebhook(JSON.parse(raw));
  // Acknowledge fast (Meta retries slow webhooks), process in the background.
  queueMicrotask(async () => {
    for (const m of messages) {
      if (one("SELECT 1 FROM messages WHERE meta LIKE ?", `%"messageId":"${m.id}"%`)) continue; // dedupe retries
      try { await handleInbound({ channel: "whatsapp", from: m.from, name: m.name, text: m.text, messageId: m.id }); }
      catch (e) { console.error("whatsapp handler", e); }
    }
  });
  return c.text("ok");
});

/* ---------- Inbound email (Postmark / Resend / Mailgun / Cloudflare Email Workers -> JSON) ---------- */
app.post("/webhooks/email", async (c) => {
  if (config.inboundEmailSecret && c.req.query("key") !== config.inboundEmailSecret) return c.text("forbidden", 403);
  const b: any = await c.req.json();
  const from = (b.FromFull?.Email ?? b.from ?? b.sender ?? "").toLowerCase();
  const text = b.StrippedTextReply || b.TextBody || b.text || b["stripped-text"] || "";
  const subject = b.Subject ?? b.subject ?? "";
  const messageId = b.MessageID ?? b.messageId ?? b["Message-Id"];
  if (!from || !text) return c.text("ignored");
  const ticketMatch = subject.match(/\[#(\d+)\]/);
  queueMicrotask(async () => {
    try {
      if (ticketMatch) await handleSupport({ channel: "email", requester: from, requesterName: b.FromName, text, subject, ticketId: Number(ticketMatch[1]), replyTo: messageId });
      else await handleInbound({ channel: "email", from, name: b.FromName ?? b.fromName, text, subject, messageId });
    } catch (e) { console.error("email handler", e); }
  });
  return c.text("ok");
});

/* ---------- Website: sales chat / contact form ---------- */
app.post("/api/enquiry", async (c) => {
  const b: any = await c.req.json();
  if (!b.contact || !b.message) return c.json({ error: "contact and message required" }, 400);
  const reply = await handleInbound({ channel: "web", from: String(b.contact).slice(0, 120), name: b.name?.slice(0, 80), text: String(b.message).slice(0, 4000) });
  return c.json({ reply });
});

/* ---------- Website: free Tech Health Check (lead magnet) ---------- */
app.post("/api/check", async (c) => {
  const b: any = await c.req.json();
  const domain = String(b.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || !email.includes("@")) return c.json({ error: "invalid input" }, 400);
  const a = await auditDomain(domain, email);
  const unknown = !a.dnsOk;
  const checks = [
    { label: "Email spoofing protection (DMARC)", ok: unknown ? null : a.dmarcPolicy === "quarantine" || a.dmarcPolicy === "reject",
      detail: unknown ? "Couldn't check right now." : a.dmarcPolicy === "missing" ? "No DMARC record: anyone can send email as you." : a.dmarcPolicy === "none" ? "Monitor-only: spoofed mail still gets through." : "Enforced. Nice." },
    { label: "Sender verification (SPF)", ok: unknown ? null : !!a.spf, detail: unknown ? "Couldn't check right now." : a.spf ? "Present." : "Missing, so your emails may land in spam." },
    { label: "Secure website (HTTPS)", ok: a.https, detail: a.https == null ? "Website didn't respond." : a.https ? "Your site uses HTTPS." : "Browsers show your site as 'Not secure'." },
    { label: "Business email platform", ok: unknown ? null : a.mailProvider === "microsoft365" || a.mailProvider === "google",
      detail: unknown ? "Couldn't check right now." : a.mailProvider === "microsoft365" ? "Microsoft 365." : a.mailProvider === "google" ? "Google Workspace." : a.mailProvider === "none" ? "No email found on this domain." : "Smaller provider: worth checking backups and security." },
  ];
  const known = checks.filter((x) => x.ok !== null);
  const score = known.length ? Math.round((known.filter((x) => x.ok).length / known.length) * 100) : null;
  // Inbound, self-submitted lead: they asked for the report, so emailing it is fine. Marketing only with consent.
  run(`INSERT INTO leads (region, name, website, domain, email, source, status, insights) VALUES (?,?,?,?,?, 'health_check', 'replied', ?)
       ON CONFLICT(source_ref) DO NOTHING`, b.region === "Costa Blanca" ? "Costa Blanca" : "UK", domain, `https://${domain}`, domain, email,
    JSON.stringify({ audit: a, marketingConsent: !!b.consent }));
  const report = [
    `Hi there,`, ``, `Here's your Tranqui Tech Health Check for ${domain}: ${score ?? "not available"}${score == null ? "" : "/100"}.`, ``,
    ...checks.map((x) => `${x.ok === null ? "?" : x.ok ? "OK " : "FIX"}  ${x.label}: ${x.detail}`), ``,
    a.findings.length ? `What we'd fix first:\n- ${a.findings.join("\n- ")}` : `Looking good. No urgent fixes from the public checks.`, ``,
    `Want us to sort it? Reply to this email or WhatsApp us. Most of these are fixed in under an hour.`, ``, `Tranqui · IT, sorted. Now relax.`,
  ].join("\n");
  queueMicrotask(() => sendEmail({ to: email, subject: score == null ? `Your tech health check for ${domain}` : `Your tech health check: ${domain} scored ${score}/100`, text: report, kind: "support" }).catch(console.error));
  queueMicrotask(() => notifyOwner(`Health check: ${domain} scored ${score}`, `${email}\n${a.findings.join("\n")}`).catch(console.error));
  return c.json({ domain, score, checks });
});

/* ---------- Support portal (replaces the patchingguy.com portal) ---------- */
app.post("/api/portal/tickets", async (c) => {
  const b: any = await c.req.json();
  if (!b.email || !b.description) return c.json({ error: "email and description required" }, 400);
  const reply = await handleSupport({ channel: "portal", requester: b.email, requesterName: b.name, subject: b.subject, text: `${b.subject ? `${b.subject}\n\n` : ""}${b.description}` });
  const t = one("SELECT id FROM tickets WHERE requester=? ORDER BY id DESC LIMIT 1", String(b.email).toLowerCase())!;
  return c.json({ ticketId: t.id, token: portalToken(t.id), reply });
});
app.get("/api/portal/tickets/:id", (c) => {
  const id = Number(c.req.param("id"));
  if (!safeEq(c.req.query("t") ?? "", portalToken(id))) return c.json({ error: "not found" }, 404);
  const ticket = one("SELECT id, subject, status, priority, created_at, updated_at FROM tickets WHERE id=?", id);
  const messages = all("SELECT direction, body, created_at FROM messages WHERE ticket_id=? AND (meta IS NULL OR meta NOT LIKE '%\"internal\":true%') ORDER BY created_at", id);
  return c.json({ ticket, messages });
});
app.post("/api/portal/tickets/:id/reply", async (c) => {
  const id = Number(c.req.param("id"));
  if (!safeEq(c.req.query("t") ?? "", portalToken(id))) return c.json({ error: "not found" }, 404);
  const t = one("SELECT * FROM tickets WHERE id=?", id)!;
  const b: any = await c.req.json();
  const reply = await handleSupport({ channel: "portal", requester: t.requester, text: String(b.message).slice(0, 4000), ticketId: id });
  return c.json({ reply });
});

/* ---------- One-click unsubscribe (PECR / RFC 8058) ---------- */
const unsub = (c: any) => {
  const e = c.req.query("e") ?? "", t = c.req.query("t") ?? "";
  if (!e || !safeEq(t, unsubscribeToken(e))) return c.text("Invalid link", 400);
  suppress(e, "unsubscribe link");
  return c.html("<p style='font-family:sans-serif'>You're unsubscribed. Sorry for the bother, and all the best. Tranqui</p>");
};
app.get("/u", unsub);
app.post("/u", unsub);

/* ---------- Admin (bearer token) ---------- */
app.use("/admin/*", async (c, next) => {
  const h = c.req.header("authorization") ?? "";
  if (!config.adminToken || !safeEq(h, `Bearer ${config.adminToken}`)) return c.text("unauthorised", 401);
  await next();
});
app.get("/admin/approvals", (c) => c.json(pendingApprovals()));
app.post("/admin/approvals/:id/:decision", async (c) => {
  const id = Number(c.req.param("id"));
  const a = getApproval(id);
  if (!a || a.status !== "pending") return c.json({ error: "not pending" }, 404);
  const edited = await c.req.json().catch(() => null);
  const payload = edited ?? a.payload;
  if (c.req.param("decision") === "reject") { decide(id, "rejected"); return c.json({ ok: true }); }
  if (a.kind === "outreach_email") { await sendOutreachEmail(payload); decide(id, "sent", undefined, payload); }
  else decide(id, "approved", undefined, payload);
  return c.json({ ok: true });
});
app.get("/admin/leads", (c) => c.json(all("SELECT id, region, name, email, entity_type, british_run, fit_score, status, updated_at FROM leads ORDER BY updated_at DESC LIMIT 200")));
app.get("/admin/tickets", (c) => c.json(all("SELECT * FROM tickets ORDER BY updated_at DESC LIMIT 200")));
app.get("/admin/tickets/:id", (c) => c.json({ ticket: one("SELECT * FROM tickets WHERE id=?", Number(c.req.param("id"))), messages: all("SELECT * FROM messages WHERE ticket_id=? ORDER BY created_at", Number(c.req.param("id"))) }));
app.post("/admin/customers", async (c) => {
  const b: any = await c.req.json();
  const id = Number(run("INSERT INTO customers (name, region, plan, users, domain, contact_email, contact_whatsapp) VALUES (?,?,?,?,?,?,?)",
    b.name, b.region, b.plan, b.users ?? null, b.domain ?? null, b.contact_email ?? null, b.contact_whatsapp ?? null).lastInsertRowid);
  for (const p of b.contacts ?? []) run("INSERT OR IGNORE INTO contacts (customer_id, name, email, whatsapp, is_admin) VALUES (?,?,?,?,?)", id, p.name, p.email?.toLowerCase() ?? null, p.whatsapp ?? null, p.is_admin ? 1 : 0);
  return c.json({ id });
});

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  serve({ fetch: app.fetch, port: config.port }, (i) => console.log(`Tranqui ops listening on :${i.port} (${config.outboundMode} mode)`));
  if (process.env.NO_SCHEDULER !== "1") startScheduler();
}
export { app };
