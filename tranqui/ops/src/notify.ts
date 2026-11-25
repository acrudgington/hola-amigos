import { config } from "./config.js";
import { sendEmail } from "./channels/email.js";
import { sendWhatsAppTemplate } from "./channels/whatsapp.js";
import { logEvent } from "./db.js";

/** Alert the owner/on-call engineer. WhatsApp template for urgent items (works outside the 24h window), email otherwise. */
export async function notifyOwner(subject: string, body: string, urgent = false) {
  logEvent("notify", urgent ? "urgent" : "info", { subject });
  if (urgent && config.ownerWhatsapp) {
    try { await sendWhatsAppTemplate(config.ownerWhatsapp, "owner_alert", [subject.slice(0, 60), body.slice(0, 900)]); } catch (e) { console.error(e); }
  }
  if (config.ownerEmail) await sendEmail({ to: config.ownerEmail, subject: `[Tranqui] ${subject}`, text: body, kind: "support", threadKey: "owner" });
}
