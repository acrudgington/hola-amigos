import { z } from "zod/v4";
import { all, one, run, logEvent } from "../db.js";
import { runAgent, extractJson } from "../llm.js";
import { BRAND_VOICE } from "../brand.js";
import { allowedColdChannels, isSuppressed, sentToday } from "../compliance.js";
import { sendEmail } from "../channels/email.js";
import { config } from "../config.js";
import { queueApproval } from "../approvals.js";

/** Sequence: first touch, gentle bump after 4 days, a useful "break-up" after 10. Then stop. */
const STEPS = [
  { day: 0, brief: "First touch. Lead with ONE specific, useful observation from the hooks, explain the risk in a sentence, offer to fix or explain it. Soft CTA: a 15-minute call or a free tech health check." },
  { day: 4, brief: "Short follow-up (under 70 words) on the same thread. Add one new helpful angle (e.g. a quick tip they can do themselves). No guilt-tripping." },
  { day: 10, brief: "Final, friendly note (under 60 words). Offer the free health-check report and say you won't email again unless they reply." },
];

const Draft = z.object({ subject: z.string().max(70), body: z.string() });

const SYSTEM = `${BRAND_VOICE}

You write cold B2B outreach emails for Tranqui. They must read like a thoughtful note from a real local person, not marketing.
Rules:
- 60-130 words for the first email. Plain text only: no links except the booking link if given, no images, no emojis, no bullet lists.
- Open with something specific about THEIR business (from the research), not about us.
- Exactly one call to action. Never mention pricing in the first email.
- Subject line: lowercase-friendly, specific, under 6 words, no clickbait, no "Re:" or "Fwd:" tricks.
- Never claim we've worked with them, never invent mutual connections, stats or clients.
- Sign off as "Antony, Tranqui". Do not add an unsubscribe line: the system appends the legal footer.
- For Costa Blanca businesses, a light nod to local life is welcome (but this channel is only used for UK companies).
Return a single \`\`\`json block: {"subject": string, "body": string}`;

const POSTAL_SYSTEM = `${BRAND_VOICE}

You write short printed letters (max 180 words) and LinkedIn connection notes (max 280 characters) for Tranqui.
They are used where cold email is not allowed (Spain under LSSI, UK sole traders under PECR).
The letter offers a free, no-obligation "Tech Health Check" and gives a QR/URL (tranqui.tech/check) and WhatsApp number.
For Costa Blanca, write in English with a short Spanish P.S.
Return a single \`\`\`json block: {"letter": string, "linkedin_note": string}`;

async function draftEmail(lead: any, step: number) {
  const insights = JSON.parse(lead.insights ?? "{}");
  const history = all("SELECT subject, body FROM messages WHERE lead_id = ? AND direction='out' ORDER BY created_at", lead.id);
  const { text } = await runAgent({
    agent: "outreach",
    system: SYSTEM,
    effort: "medium",
    messages: [{
      role: "user",
      content: `Step ${step + 1} of ${STEPS.length}: ${STEPS[step].brief}
Business: ${lead.name} (${lead.region}, ${lead.category ?? "small business"})
Contact: ${lead.contact_name ?? "unknown name"} <${lead.email}>
Research summary: ${insights.summary ?? "n/a"}
Hooks: ${(insights.hooks ?? []).join(" | ") || "none"}
Tech audit findings: ${(insights.audit?.findings ?? []).join(" | ") || "none"}
Booking link: ${config.bookingUrl || "none"}
Previous emails in this thread: ${history.length ? JSON.stringify(history) : "none"}`,
    }],
  });
  return Draft.parse(extractJson(text));
}

/** Decide and execute the next touch for every lead that is due. */
export async function runOutreach(limit = 25) {
  const due = all(
    `SELECT * FROM leads WHERE status IN ('enriched','contacted') AND fit_score >= 60
     AND (next_action_at IS NULL OR next_action_at <= datetime('now')) ORDER BY fit_score DESC LIMIT ?`, limit);
  let emailed = 0, queued = 0, manual = 0;

  for (const lead of due) {
    const channels = allowedColdChannels(lead);
    const step = lead.stage_step as number;
    if (step >= STEPS.length) { run("UPDATE leads SET status='lost', updated_at=datetime('now') WHERE id=?", lead.id); continue; }

    if (channels.includes("email") && lead.email && !isSuppressed(lead.email)) {
      if (sentToday() >= config.outreach.dailyCap) break; // protect the sending domain's reputation
      const draft = await draftEmail(lead, step);
      const payload = { leadId: lead.id, to: lead.email, step, ...draft };
      if (config.outboundMode === "autopilot") {
        await sendOutreachEmail(payload);
        emailed++;
      } else {
        queueApproval("outreach_email", payload);
        queued++;
      }
      const next = STEPS[step + 1]?.day;
      run(
        `UPDATE leads SET status='contacted', stage_step=?, next_action_at=${next != null ? `datetime('now', '+${next - STEPS[step].day} days')` : "NULL"}, updated_at=datetime('now') WHERE id=?`,
        step + 1, lead.id,
      );
    } else if (step === 0) {
      // Warm/manual channel: letter + LinkedIn note for the owner (or a print-and-post API) to action.
      const { text } = await runAgent({
        agent: "outreach",
        system: POSTAL_SYSTEM,
        effort: "low",
        messages: [{ role: "user", content: `Business: ${lead.name}, ${lead.address ?? ""} (${lead.region}). Contact: ${lead.contact_name ?? "the owner"}.\nResearch: ${lead.insights ?? "{}"}` }],
      });
      queueApproval("postal_letter", { leadId: lead.id, address: lead.address, channels, ...extractJson<object>(text) });
      run("UPDATE leads SET status='queued', stage_step=?, next_action_at=NULL, updated_at=datetime('now') WHERE id=?", STEPS.length, lead.id);
      manual++;
    }
  }
  logEvent("outreach", "run", { emailed, queued, manual });
  return { emailed, queued, manual };
}

export async function sendOutreachEmail(p: { leadId: number; to: string; subject: string; body: string }) {
  if (isSuppressed(p.to)) return;
  const prev = one("SELECT meta FROM messages WHERE lead_id=? AND direction='out' ORDER BY created_at DESC LIMIT 1", p.leadId);
  const inReplyTo = prev ? JSON.parse(prev.meta ?? "{}").messageId : undefined;
  await sendEmail({ to: p.to, subject: inReplyTo ? `Re: ${p.subject.replace(/^re:\s*/i, "")}` : p.subject, text: p.body, kind: "outreach", leadId: p.leadId, inReplyTo });
}
