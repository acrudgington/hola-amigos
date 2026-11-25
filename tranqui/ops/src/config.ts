import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Load .env without a dependency (KEY=VALUE, optional quotes). */
function loadDotEnv() {
  try {
    const raw = readFileSync(path.join(here, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env file: rely on real environment */
  }
}
loadDotEnv();

const env = (k: string, d = "") => process.env[k] ?? d;

export const config = {
  model: env("TRANQUI_MODEL", "claude-opus-5-5"),
  baseUrl: env("PUBLIC_BASE_URL", "http://localhost:8787"),
  port: Number(env("PORT", "8787")),
  dbPath: env("DB_PATH", path.join(here, "..", "data", "tranqui.db")),
  adminToken: env("ADMIN_TOKEN"),
  ownerEmail: env("OWNER_EMAIL"),
  ownerWhatsapp: env("OWNER_WHATSAPP"),
  outboundMode: env("OUTBOUND_MODE", "review") as "review" | "autopilot",
  bookingUrl: env("BOOKING_URL"),
  places: { key: env("GOOGLE_PLACES_API_KEY") },
  companiesHouse: { key: env("COMPANIES_HOUSE_API_KEY") },
  outreach: {
    smtp: env("OUTREACH_SMTP_URL"),
    from: env("OUTREACH_FROM"),
    dailyCap: Number(env("OUTREACH_DAILY_CAP", "40")),
    postalAddress: env("OUTREACH_POSTAL_ADDRESS"),
  },
  support: { smtp: env("SUPPORT_SMTP_URL"), from: env("SUPPORT_FROM") },
  inboundEmailSecret: env("INBOUND_EMAIL_SECRET"),
  whatsapp: {
    token: env("WHATSAPP_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: env("WHATSAPP_VERIFY_TOKEN"),
    appSecret: env("META_APP_SECRET"),
  },
  social: {
    pageId: env("META_PAGE_ID"),
    pageToken: env("META_PAGE_TOKEN"),
    igId: env("INSTAGRAM_BUSINESS_ID"),
    tiktokToken: env("TIKTOK_ACCESS_TOKEN"),
  },
};

export const isConfigured = (v: string) => v.length > 0;
