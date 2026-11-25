import { z } from "zod/v4";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { all, one, run, logEvent } from "../db.js";
import { runAgent } from "../llm.js";
import { BRAND_VOICE } from "../brand.js";
import { searchKb } from "../kb.js";
import { runRmmAction, SAFE_ACTIONS, SENSITIVE_ACTIONS, type RmmAction } from "../rmm.js";
import { sendEmail } from "../channels/email.js";
import { sendWhatsApp } from "../channels/whatsapp.js";
import { notifyOwner } from "../notify.js";
import { config } from "../config.js";

export type SupportIn = {
  channel: "email" | "whatsapp" | "portal";
  requester: string; requesterName?: string; text: string; subject?: string;
  ticketId?: number; replyTo?: string; alreadyLogged?: boolean;
};

/** Response targets by plan and priority, in hours. */
const SLA: Record<string, Record<string, number>> = {
  calma: { P1: 4, P2: 8, P3: 24, P4: 48 },
  tranqui: { P1: 1, P2: 4, P3: 8, P4: 24 },
  siesta: { P1: 0.5, P2: 1, P3: 4, P4: 8 },
  none: { P1: 4, P2: 8, P3: 24, P4: 48 },
};

const SYSTEM = `${BRAND_VOICE}

You are Tranqui's first-line support engineer. You talk to staff at our customers' businesses on WhatsApp, email and the support portal.

How you work:
1. Understand the problem with as few questions as possible (one at a time on WhatsApp). Ask for a screenshot if it helps.
2. Search the runbooks (search_runbooks) and walk them through the fix step by step. Confirm each step worked.
3. You may run SAFE remote actions yourself with remote_action when the customer has a device under management.
4. SENSITIVE actions (password reset, MFA reset, sign-out, block, isolate) need identity verification:
   the requester must be a registered contact (verified=true in the context). If not verified, escalate; never bypass.
5. Keep the ticket updated (update_ticket) with category, priority and a one-line summary.
   Priority guide: P1 = business stopped or security incident (phishing click, ransomware, payment fraud). P2 = one person can't work.
   P3 = annoying but workable. P4 = question/request.
6. Escalate to a human engineer (escalate) for: P1 security incidents (immediately), hardware faults, anything needing on-site,
   anything you've tried twice without success, angry customers, or requests to change billing/contracts.
7. When fixed, ask them to confirm, then set status resolved and ask for a 1-5 rating.
Never ask for or repeat passwords. Never guess at a fix that could lose data. Be calm: people are often stressed when they write in.`;

function ticketHistory(ticketId: number): BetaMessageParam[] {
  const rows = all("SELECT direction, body FROM messages WHERE ticket_id=? ORDER BY created_at DESC LIMIT 24", ticketId).reverse();
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

function findOpenTicket(requester: string) {
  return one("SELECT * FROM tickets WHERE requester=? AND status IN ('open','waiting_customer','escalated') AND updated_at > datetime('now','-3 days') ORDER BY updated_at DESC LIMIT 1", requester.toLowerCase());
}

export async function handleSupport(m: SupportIn): Promise<string> {
  const requester = m.requester.toLowerCase();
  const contact = one("SELECT c.*, cu.name AS company, cu.plan, cu.id AS cid FROM contacts c JOIN customers cu ON cu.id=c.customer_id WHERE lower(c.email)=? OR c.whatsapp=?", requester, m.requester);
  let ticket = m.ticketId ? one("SELECT * FROM tickets WHERE id=?", m.ticketId) : findOpenTicket(requester);
  if (!ticket) {
    const plan = contact?.plan ?? "none";
    const id = Number(run(
      `INSERT INTO tickets (customer_id, requester, requester_name, channel, subject, sla_due_at) VALUES (?,?,?,?,?, datetime('now', ?))`,
      contact?.cid ?? null, requester, m.requesterName ?? contact?.name ?? null, m.channel, (m.subject ?? m.text).slice(0, 120), `+${SLA[plan].P3 * 60} minutes`,
    ).lastInsertRowid);
    ticket = one("SELECT * FROM tickets WHERE id=?", id)!;
  }
  const ticketId = ticket.id as number;
  if (m.alreadyLogged) run("UPDATE messages SET ticket_id=? WHERE id=(SELECT max(id) FROM messages WHERE thread_key=? AND direction='in')", ticketId, requester);
  else run("INSERT INTO messages (channel, direction, thread_key, ticket_id, subject, body) VALUES (?, 'in', ?, ?, ?, ?)", m.channel, requester, ticketId, m.subject ?? null, m.text);
  run("UPDATE tickets SET status = CASE WHEN status='waiting_customer' THEN 'open' ELSE status END, updated_at=datetime('now') WHERE id=?", ticketId);

  const verified = !!contact;
  const tools = [
    betaZodTool({
      name: "search_runbooks",
      description: "Search Tranqui's fix-it runbooks for a problem description.",
      inputSchema: z.object({ query: z.string() }),
      run: async (i) => JSON.stringify(searchKb(i.query)),
    }),
    betaZodTool({
      name: "remote_action",
      description: `Run a remote action on the customer's managed device or account. Safe: ${Object.keys(SAFE_ACTIONS).join(", ")}. Sensitive (verified requester only): ${Object.keys(SENSITIVE_ACTIONS).join(", ")}.`,
      inputSchema: z.object({ action: z.enum([...Object.keys(SAFE_ACTIONS), ...Object.keys(SENSITIVE_ACTIONS)] as [RmmAction, ...RmmAction[]]), device: z.string().optional(), user: z.string().optional() }),
      run: async (i) => {
        if (!contact) return "Not available: requester is not a registered contact of a managed customer.";
        if (i.action in SENSITIVE_ACTIONS && !verified) return "Refused: identity not verified. Escalate to an engineer.";
        const res = await runRmmAction(i.action, { customerId: contact.cid, device: i.device, user: i.user ?? contact.email });
        run("INSERT INTO messages (channel, direction, thread_key, ticket_id, body, meta) VALUES ('portal','out',?,?,?, '{\"internal\":true}')", requester, ticketId, `[action] ${i.action}: ${JSON.stringify(res)}`);
        return JSON.stringify(res);
      },
    }),
    betaZodTool({
      name: "update_ticket",
      description: "Update this ticket's fields.",
      inputSchema: z.object({
        category: z.enum(["email", "account", "device", "network", "printer", "security", "software", "request", "other"]).optional(),
        priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
        status: z.enum(["open", "waiting_customer", "resolved"]).optional(),
        summary: z.string().optional(),
        csat: z.number().int().min(1).max(5).optional(),
      }),
      run: async (i) => {
        const sla = i.priority ? `+${SLA[contact?.plan ?? "none"][i.priority] * 60} minutes` : null;
        run(`UPDATE tickets SET category=coalesce(?,category), priority=coalesce(?,priority), status=coalesce(?,status), summary=coalesce(?,summary),
             csat=coalesce(?,csat), sla_due_at=CASE WHEN ? IS NULL THEN sla_due_at ELSE datetime(created_at, ?) END, updated_at=datetime('now') WHERE id=?`,
          i.category ?? null, i.priority ?? null, i.status ?? null, i.summary ?? null, i.csat ?? null, sla, sla, ticketId);
        return "updated";
      },
    }),
    betaZodTool({
      name: "escalate",
      description: "Hand the ticket to a human engineer. Include everything tried so far.",
      inputSchema: z.object({ reason: z.string(), priority: z.enum(["P1", "P2", "P3", "P4"]), needs_onsite: z.boolean().optional() }),
      run: async (i) => {
        run("UPDATE tickets SET status='escalated', assignee='engineer', priority=?, updated_at=datetime('now') WHERE id=?", i.priority, ticketId);
        await notifyOwner(`Ticket #${ticketId} ${i.priority}${i.needs_onsite ? " (on-site)" : ""}: ${contact?.company ?? requester}`,
          `${i.reason}\n\nOpen: ${config.baseUrl}/admin/tickets/${ticketId}`, i.priority === "P1" || i.priority === "P2");
        return `Escalated. Tell the customer an engineer will be in touch within the ${i.priority} response target.`;
      },
    }),
  ];

  const context = `Ticket #${ticketId} (status ${ticket.status}, priority ${ticket.priority}). Channel: ${m.channel}.
Requester: ${m.requesterName ?? contact?.name ?? "unknown"} <${m.requester}>. verified=${verified}.
Customer: ${contact ? `${contact.company} on the ${contact.plan} plan` : "NOT a managed customer: help briefly, then offer Rescue (pay-as-you-go) or a plan."}`;

  const { text } = await runAgent({
    agent: "support",
    system: SYSTEM,
    effort: "medium",
    tools,
    messages: [...ticketHistory(ticketId), { role: "system", content: context } as unknown as BetaMessageParam],
  });

  if (m.channel === "whatsapp") {
    await sendWhatsApp(m.requester, text, { ticketId });
    run("UPDATE messages SET ticket_id=? WHERE id=(SELECT max(id) FROM messages WHERE channel='whatsapp' AND direction='out' AND thread_key=?)", ticketId, m.requester);
  } else if (m.channel === "email") {
    await sendEmail({ to: m.requester, subject: `Re: [#${ticketId}] ${ticket.subject}`, text, kind: "support", ticketId, threadKey: requester, inReplyTo: m.replyTo });
  } else {
    run("INSERT INTO messages (channel, direction, thread_key, ticket_id, body) VALUES ('portal', 'out', ?, ?, ?)", requester, ticketId, text);
  }
  logEvent("support", "replied", { ticketId });
  return text;
}

/** Breach watcher, run every 10 minutes by the scheduler. */
export async function checkSlas() {
  const due = all("SELECT * FROM tickets WHERE status IN ('open','escalated') AND sla_due_at < datetime('now','+30 minutes') AND (summary IS NULL OR summary NOT LIKE '%[sla-warned]%')");
  for (const t of due) {
    await notifyOwner(`SLA risk: ticket #${t.id} (${t.priority})`, `${t.subject}\nDue: ${t.sla_due_at} UTC`, t.priority === "P1" || t.priority === "P2");
    run("UPDATE tickets SET summary = coalesce(summary,'') || ' [sla-warned]' WHERE id=?", t.id);
  }
  return due.length;
}
