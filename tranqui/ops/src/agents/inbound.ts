import { z } from "zod/v4";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { all, one, run, logEvent } from "../db.js";
import { runAgent } from "../llm.js";
import { BRAND_VOICE } from "../brand.js";
import { catalog, type Region } from "../catalog.js";
import { config } from "../config.js";
import { looksLikeOptOut, suppress } from "../compliance.js";
import { sendEmail } from "../channels/email.js";
import { sendWhatsApp } from "../channels/whatsapp.js";
import { notifyOwner } from "../notify.js";
import { handleSupport } from "./support.js";

export type Inbound = { channel: "email" | "whatsapp" | "web"; from: string; name?: string; text: string; subject?: string; messageId?: string };

/** Deterministic quote maths so the model never makes up a number. */
export function quote(planId: string, users: number, region: Region, annual = false) {
  const plan = catalog.plans.find((p) => p.id === planId);
  if (!plan) throw new Error(`unknown plan ${planId}`);
  const seats = Math.max(users, plan.minUsers);
  const cur = region === "UK" ? "GBP" : "EUR";
  const sym = cur === "GBP" ? "£" : "€";
  const monthly = plan.price[cur] * seats;
  const onboarding = annual ? 0 : (cur === "GBP" ? 99 + 10 * seats : 110 + 11 * seats);
  const annualTotal = monthly * (annual ? 10 : 12);
  return {
    plan: plan.name, seats, currency: cur,
    monthly: `${sym}${monthly}`, onboarding: `${sym}${onboarding}`,
    firstYear: `${sym}${annualTotal + onboarding}`,
    note: `${region === "UK" ? "Excludes VAT (20%)" : "Excludes IVA (21%)"}.${annual ? " Annual: 2 months free, onboarding waived." : ""}`,
  };
}

const SALES_SYSTEM = `${BRAND_VOICE}

You are Tranqui's front desk for new enquiries on WhatsApp, email and the website chat.
Goals, in order: 1) be genuinely helpful, 2) understand their situation (staff count, devices, Microsoft 365 or Google, current IT pain, UK or Costa Blanca),
3) recommend the right plan with a real quote from the quote tool, 4) book a 15-minute call or the free Tech Health Check.

Behaviour:
- WhatsApp: short messages (max ~70 words), friendly, one question at a time. Email: a little fuller but still brief.
- Use save_lead_details whenever you learn something new about them.
- If they have an urgent IT problem RIGHT NOW, offer the Rescue pay-as-you-go service and call open_rescue_ticket.
- Use escalate_to_human if they ask for a person, are angry, want a bespoke deal or discount, mention legal issues, or you are unsure.
- If they say they're not interested or ask us to stop, apologise briefly, confirm they won't hear from us again, and call opt_out.
- Never promise anything not in the catalogue. Never take card details in chat.`;

function history(threadKey: string): BetaMessageParam[] {
  const rows = all("SELECT direction, body FROM messages WHERE thread_key = ? ORDER BY created_at DESC LIMIT 20", threadKey).reverse();
  const msgs: BetaMessageParam[] = [];
  for (const r of rows) {
    const role = r.direction === "in" ? "user" : "assistant";
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n\n${r.body}`;
    else msgs.push({ role, content: r.body });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

function findCustomerContact(from: string) {
  const key = from.toLowerCase();
  return one("SELECT c.*, cu.name AS company, cu.plan, cu.region FROM contacts c JOIN customers cu ON cu.id = c.customer_id WHERE lower(c.email)=? OR c.whatsapp=?", key, from);
}

async function reply(m: Inbound, text: string, threadKey: string, leadId?: number) {
  if (m.channel === "whatsapp") await sendWhatsApp(m.from, text, { agent: "inbound" });
  else if (m.channel === "email") await sendEmail({ to: m.from, subject: `Re: ${m.subject ?? "Your enquiry"}`.replace(/^Re: Re:/i, "Re:"), text, kind: "inbound", threadKey, leadId, inReplyTo: m.messageId });
  else run("INSERT INTO messages (channel, direction, thread_key, lead_id, body) VALUES ('portal','out',?,?,?)", threadKey, leadId ?? null, text);
}

/** Entry point for every inbound WhatsApp/email/web message that isn't on an existing ticket. */
export async function handleInbound(m: Inbound): Promise<string> {
  const threadKey = m.from.toLowerCase();
  run("INSERT INTO messages (channel, direction, thread_key, subject, body, meta) VALUES (?, 'in', ?, ?, ?, ?)",
    m.channel === "web" ? "portal" : m.channel, threadKey, m.subject ?? null, m.text, JSON.stringify({ name: m.name, messageId: m.messageId }));

  // 1) Existing customers go straight to the support agent.
  const contact = findCustomerContact(m.from);
  if (contact) return handleSupport({ channel: m.channel === "web" ? "portal" : m.channel, requester: m.from, requesterName: m.name ?? contact.name, text: m.text, subject: m.subject, replyTo: m.messageId, alreadyLogged: true });

  // 2) Replies to outreach: honour opt-outs instantly, before any model call.
  let lead = one("SELECT * FROM leads WHERE lower(email)=? OR phone=?", threadKey, m.from);
  if (lead && looksLikeOptOut(m.text)) {
    suppress(m.from, "replied opt-out");
    const bye = m.text.match(/[áéíóúñ¿¡]|baja/i) ? "Entendido, no te volveremos a escribir. ¡Que vaya genial!" : "Understood, you won't hear from us again. All the best!";
    await reply(m, bye, threadKey, lead.id);
    return bye;
  }
  if (!lead) {
    const id = run("INSERT INTO leads (region, name, email, phone, contact_name, source, status) VALUES (?, ?, ?, ?, ?, 'inbound', 'replied')",
      m.from.startsWith("+34") || m.from.startsWith("34") ? "Costa Blanca" : "UK", m.name ?? m.from,
      m.from.includes("@") ? m.from : null, m.from.includes("@") ? null : m.from, m.name ?? null).lastInsertRowid;
    lead = one("SELECT * FROM leads WHERE id=?", Number(id))!;
    await notifyOwner(`New enquiry via ${m.channel}`, `${m.name ?? m.from}: ${m.text.slice(0, 500)}`);
  } else if (lead.status === "contacted" || lead.status === "enriched") {
    run("UPDATE leads SET status='replied', next_action_at=NULL, updated_at=datetime('now') WHERE id=?", lead.id);
    await notifyOwner(`Outreach reply from ${lead.name}`, m.text.slice(0, 800));
  }
  const leadId = lead.id as number;

  const tools = [
    betaZodTool({
      name: "get_quote",
      description: "Calculate an exact price for a plan. Always use this before stating any total.",
      inputSchema: z.object({ plan: z.enum(["calma", "tranqui", "siesta"]), users: z.number().int().min(1), region: z.enum(["UK", "Costa Blanca"]), annual: z.boolean().optional() }),
      run: async (i) => JSON.stringify(quote(i.plan, i.users, i.region, i.annual)),
    }),
    betaZodTool({
      name: "save_lead_details",
      description: "Save what you've learned about this prospect.",
      inputSchema: z.object({
        company: z.string().optional(), contact_name: z.string().optional(), email: z.string().optional(),
        region: z.enum(["UK", "Costa Blanca"]).optional(), staff: z.number().int().optional(), notes: z.string().optional(),
        stage: z.enum(["replied", "meeting", "customer", "lost"]).optional(),
      }),
      run: async (i) => {
        const prev = JSON.parse(one("SELECT insights FROM leads WHERE id=?", leadId)?.insights ?? "{}");
        run(`UPDATE leads SET name=coalesce(?,name), contact_name=coalesce(?,contact_name), email=coalesce(?,email), region=coalesce(?,region),
             status=coalesce(?,status), insights=?, updated_at=datetime('now') WHERE id=?`,
          i.company ?? null, i.contact_name ?? null, i.email ?? null, i.region ?? null, i.stage ?? null,
          JSON.stringify({ ...prev, staff: i.staff ?? prev.staff, notes: [prev.notes, i.notes].filter(Boolean).join("\n") }), leadId);
        return "saved";
      },
    }),
    betaZodTool({
      name: "booking_link",
      description: "Get the link for them to book a 15-minute call or free Tech Health Check.",
      inputSchema: z.object({ kind: z.enum(["call", "health_check"]) }),
      run: async (i) => { run("UPDATE leads SET status='meeting' WHERE id=? AND status!='customer'", leadId); return `${config.bookingUrl}${i.kind === "health_check" ? "?type=health-check" : ""}`; },
    }),
    betaZodTool({
      name: "open_rescue_ticket",
      description: "Open a pay-as-you-go Rescue ticket for a non-customer with an urgent problem. An engineer will pick it up.",
      inputSchema: z.object({ summary: z.string(), urgency: z.enum(["P1", "P2", "P3"]) }),
      run: async (i) => {
        const id = run("INSERT INTO tickets (requester, requester_name, channel, subject, priority, status, assignee) VALUES (?,?,?,?,?, 'escalated', 'engineer')",
          m.from, m.name ?? null, m.channel, `[Rescue] ${i.summary}`, i.urgency).lastInsertRowid;
        await notifyOwner(`Rescue ticket #${id} (${i.urgency})`, `${m.name ?? m.from}: ${i.summary}`, i.urgency !== "P3");
        return `Ticket #${id} opened. Rescue rate: £${catalog.payg.price.GBP} / €${catalog.payg.price.EUR} ${catalog.payg.unit}.`;
      },
    }),
    betaZodTool({
      name: "escalate_to_human",
      description: "Hand the conversation to Antony. Use for requests for a person, complaints, discounts, bespoke deals, or uncertainty.",
      inputSchema: z.object({ reason: z.string() }),
      run: async (i) => { await notifyOwner(`Human needed: ${lead!.name}`, `${i.reason}\n\nLast message: ${m.text}`, true); return "Antony has been alerted and will reply personally, usually within a couple of hours during the day."; },
    }),
    betaZodTool({
      name: "opt_out",
      description: "They asked not to be contacted again.",
      inputSchema: z.object({}),
      run: async () => { suppress(m.from, "asked in conversation"); return "suppressed"; },
    }),
  ];

  const { text } = await runAgent({
    agent: "inbound",
    system: SALES_SYSTEM,
    effort: "low",
    tools,
    messages: [
      ...history(threadKey),
      { role: "system", content: `Channel: ${m.channel}. Known about this lead: ${JSON.stringify({ name: lead.name, region: lead.region, status: lead.status, insights: lead.insights ? JSON.parse(lead.insights).summary : null })}` } as unknown as BetaMessageParam,
    ],
  });
  await reply(m, text, threadKey, leadId);
  logEvent("inbound", "replied", { leadId, channel: m.channel });
  return text;
}
