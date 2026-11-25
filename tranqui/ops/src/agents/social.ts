import { z } from "zod/v4";
import { all, run, logEvent } from "../db.js";
import { runAgent, extractJson, webSearch } from "../llm.js";
import { BRAND_VOICE } from "../brand.js";
import { renderSlide, type Theme } from "../channels/render.js";
import { postFacebook, postInstagram, postTikTok } from "../channels/social.js";
import { queueApproval, decide } from "../approvals.js";
import { config } from "../config.js";

/** Content pillars and a weekly rhythm. Edit to taste. */
const PILLARS = [
  "Scam alert: a real, current scam targeting UK or Spanish small businesses/expats, and how to spot it",
  "60-second tech tip that saves time (Microsoft 365, Google Workspace, phones, Wi-Fi)",
  "Myth vs fact about cyber security for small businesses",
  "Costa Blanca life + tech: e.g. fibre outages after storms, working from a villa, Spanish bank SMS scams, NIE/online admin safety",
  "Behind the scenes: how our AI helpdesk + engineers fix problems (no customer names)",
  "Gentle offer: free Tech Health Check / DMARC check (max once a week)",
];

const Post = z.object({
  pillar: z.string(),
  networks: z.array(z.enum(["instagram", "facebook", "tiktok"])).min(1),
  theme: z.enum(["sunset", "sea", "sand"]),
  slides: z.array(z.object({ kicker: z.string().optional(), headline: z.string().max(70), body: z.string().max(220).optional() })).min(1).max(7),
  caption: z.string(),
  tiktok_title: z.string().max(90),
  hashtags: z.array(z.string()).max(8),
  publish_at: z.string().describe("ISO 8601 local Europe/Madrid time"),
  sources: z.array(z.string()).describe("URLs used for any factual claim (scam alerts must have at least one)"),
});
const Plan = z.object({ posts: z.array(Post) });

const SYSTEM = `${BRAND_VOICE}

You are Tranqui's social media manager for Instagram, Facebook and TikTok.
Audience: owners of small businesses in the UK, and British business owners/expats on the Costa Blanca.
Format: carousels of 1080x1350 slides (TikTok photo mode uses the same slides). Slide 1 is the hook (max ~8 words).
Every post must teach something useful on its own. Max one soft CTA per post ("DM us 'CHECK' for a free health check").
Factual claims (especially scam alerts) must come from a reputable source found with web_search
(Action Fraud, NCSC, Which?, INCIBE, Guardia Civil, Policía Nacional, BBC, El País, Sur in English, The Olive Press).
Never use fear-mongering, never name or shame businesses, never claim results we don't have.
Captions: Instagram/Facebook 60-150 words with line breaks; mix English and the odd Spanish word naturally.
Best posting windows (Europe/Madrid): Tue-Thu 08:00-09:30, 12:30-13:30, 19:00-21:00; Sun 10:00-11:00.
Return a single \`\`\`json block: {"posts":[{pillar, networks, theme, slides:[{kicker?, headline, body?}], caption, tiktok_title, hashtags, publish_at, sources}]}`;

/** Weekly planning job: research, write and render next week's posts, then queue them for approval. */
export async function planWeek(postsPerWeek = 4) {
  const recent = all("SELECT payload FROM approvals WHERE kind='social_post' ORDER BY created_at DESC LIMIT 12").map((r) => JSON.parse(r.payload).slides?.[0]?.headline);
  const { text } = await runAgent({
    agent: "social",
    system: SYSTEM,
    effort: "medium",
    tools: [{ ...webSearch, max_uses: 6 }],
    messages: [{
      role: "user",
      content: `Plan ${postsPerWeek} posts for the week starting ${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}.
Use these pillars, at most one each: ${PILLARS.join(" | ")}
Avoid repeating these recent hooks: ${recent.filter(Boolean).join(" | ") || "none"}`,
    }],
  });
  const plan = Plan.parse(extractJson(text));
  const ids: number[] = [];
  for (const [n, post] of plan.posts.entries()) {
    const id = `post-${Date.now()}-${n}`;
    const images = [];
    for (const [i, s] of post.slides.entries()) images.push(await renderSlide(s, i, post.slides.length, post.theme as Theme, id));
    const payload = { ...post, images, caption: `${post.caption}\n\n${post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` };
    const approvalId = queueApproval("social_post", payload);
    if (config.outboundMode === "autopilot") decide(approvalId, "approved", "autopilot");
    ids.push(approvalId);
  }
  logEvent("social", "planned", { count: ids.length });
  return ids;
}

/** Publisher job: posts approved items whose time has come. */
export async function publishDue() {
  const rows = all("SELECT * FROM approvals WHERE kind='social_post' AND status='approved'");
  let published = 0;
  for (const r of rows) {
    const p = JSON.parse(r.payload);
    if (new Date(p.publish_at).getTime() > Date.now()) continue;
    const results: Record<string, unknown> = {};
    try {
      if (p.networks.includes("instagram")) results.instagram = await postInstagram(p.caption, p.images);
      if (p.networks.includes("facebook")) results.facebook = await postFacebook(p.caption, p.images);
      if (p.networks.includes("tiktok")) results.tiktok = await postTikTok(p.tiktok_title, p.caption, p.images);
      decide(r.id, "sent", JSON.stringify(results));
      published++;
    } catch (err) {
      decide(r.id, "failed", String(err));
      run("INSERT INTO events (agent, kind, detail) VALUES ('social','publish_failed',?)", String(err));
    }
  }
  return published;
}
