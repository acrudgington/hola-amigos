import cron from "node-cron";
import { discover, enrichPending } from "./agents/prospector.js";
import { runOutreach } from "./agents/outreach.js";
import { planWeek, publishDue } from "./agents/social.js";
import { checkSlas } from "./agents/support.js";
import { dailyDigest } from "./agents/digest.js";
import { logEvent } from "./db.js";

const running = new Set<string>();
function job(name: string, fn: () => Promise<unknown>) {
  return async () => {
    if (running.has(name)) return;
    running.add(name);
    try { logEvent("scheduler", name, await fn()); }
    catch (e) { console.error(`[${name}]`, e); logEvent("scheduler", `${name}:error`, String(e)); }
    finally { running.delete(name); }
  };
}

/** All times Europe/Madrid (UK is one hour behind). */
export function startScheduler() {
  const tz = { timezone: "Europe/Madrid" };
  cron.schedule("*/10 * * * *", job("sla", checkSlas), tz);
  cron.schedule("*/15 * * * *", job("publish", publishDue), tz);
  cron.schedule("0 6 * * 1-5", job("discover", async () => ({
    uk: await discover({ region: "UK" }), cb: await discover({ region: "Costa Blanca" }),
  })), tz);
  cron.schedule("30 6 * * 1-5", job("enrich", () => enrichPending(25)), tz);
  cron.schedule("15 10 * * 2-4", job("outreach", () => runOutreach(40)), tz); // 09:15 UK, Tue-Thu
  cron.schedule("0 11 * * 5", job("social-plan", () => planWeek(4)), tz);
  cron.schedule("30 7 * * *", job("digest", dailyDigest), tz);
  console.log("Scheduler started");
}
