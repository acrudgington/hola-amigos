import { all, one } from "../db.js";
import { runAgent } from "../llm.js";
import { notifyOwner } from "../notify.js";

/** 07:30 daily: what happened, what needs you, what's at risk. */
export async function dailyDigest() {
  const stats = {
    newLeads: one("SELECT count(*) n FROM leads WHERE created_at > datetime('now','-1 day')")?.n,
    enriched: one("SELECT count(*) n FROM leads WHERE status='enriched' AND updated_at > datetime('now','-1 day')")?.n,
    emailsSent: one("SELECT count(*) n FROM messages WHERE channel='email' AND direction='out' AND meta LIKE '%\"outreach\":true%' AND created_at > datetime('now','-1 day')")?.n,
    replies: all("SELECT name, status FROM leads WHERE status IN ('replied','meeting') AND updated_at > datetime('now','-1 day')"),
    pendingApprovals: all("SELECT kind, count(*) n FROM approvals WHERE status='pending' GROUP BY kind"),
    openTickets: all("SELECT id, priority, status, subject, sla_due_at FROM tickets WHERE status IN ('open','escalated','waiting_customer') ORDER BY priority"),
    resolvedByAi: one("SELECT count(*) n FROM tickets WHERE status='resolved' AND assignee='ai' AND updated_at > datetime('now','-1 day')")?.n,
    csat: one("SELECT avg(csat) a FROM tickets WHERE csat IS NOT NULL AND updated_at > datetime('now','-7 days')")?.a,
    failures: all("SELECT agent, kind, detail FROM events WHERE kind IN ('refusal','publish_failed') AND created_at > datetime('now','-1 day')"),
  };
  const { text } = await runAgent({
    agent: "digest",
    system: "You write a crisp morning briefing for the owner of Tranqui, an automated IT support business. Plain text, British English, under 200 words. Order: needs your attention now, today's numbers, pipeline, risks. Be specific, no fluff.",
    effort: "low",
    messages: [{ role: "user", content: JSON.stringify(stats) }],
  });
  await notifyOwner("Morning briefing", text);
  return text;
}
