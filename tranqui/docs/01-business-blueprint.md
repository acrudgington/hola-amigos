# Tranqui: business blueprint

> **IT, sorted. Now relax.** / *Tu informática, resuelta. Tranqui.*
> British-run, AI-first IT support for small businesses in the UK and on the Costa Blanca.

## 1. The name

**Tranqui** is Spanish slang for "relax / no worries / chill" (short for *tranquilo*). Every Brit on the Costa Blanca hears it daily, and in the UK it reads as a fresh, friendly brand word.

Why it works:

- **It names the outcome, not the product.** Nobody wants IT support. They want to stop worrying about IT. *Tranqui* is that feeling.
- **It bridges both markets.** It's Spanish enough to belong on the Costa Blanca and easy to pronounce for UK owners (TRAN-kee).
- **It's short and ownable.** Seven letters, easy on WhatsApp ("just message Tranqui"), and suits playful copy ("Stay tranqui", "Ready to be tranqui?").
- **Plan names keep the theme:** *Calma* → *Tranqui* → *Siesta* (sleep-easy cover).
- **Quick search conflict check:** no UK or Spanish IT company trading as "Tranqui" turned up. "Sort-IT" exists in Warwick, which is why I rejected "Sortido".

**Before you commit (I can't verify these from here):**

1. Companies House name availability, e.g. *Tranqui Tech Ltd*.
2. UKIPO, EUIPO and OEPM trademark searches in classes 42 (IT services) and 37 (repair).
3. Domains: `tranqui.tech`, `tranqui.co.uk`, `tranqui.es`, plus 1-2 separate outreach domains (`gettranqui.co.uk`, `hellotranqui.co.uk`).
4. Social handles: @tranqui.tech or @tranquitech on Instagram, TikTok and Facebook.

Fallback names if Tranqui is blocked: **Siesta IT**, **Solsorted**, **Kettle & Cloud**.

## 2. Positioning

| | |
|---|---|
| **Who** | Owner-managed businesses with 2-30 staff. UK: accountants, solicitors, estate agents, clinics, architects, recruiters, insurance brokers. Costa Blanca: British-owned estate agents, property managers, gestorías serving expats, clinics, bars and restaurants with back offices, builders, pool and villa services. |
| **Their pain** | "My nephew does our IT." Nobody patches anything. Phishing scares. Slow fixes. On the Costa: Spanish-only ISPs and suppliers, bank SMS scams, nobody local who speaks English *and* knows tech. |
| **Promise** | A WhatsApp message gets a fix in minutes, 24/7. Security and patching happen automatically. A real British engineer when it matters. |
| **Proof engine** | The free **Tech Health Check** (DMARC/SPF/HTTPS/email platform), automated and built into the site and outreach. |
| **Unfair advantage** | AI does 70-85% of first-line work, so we can price below traditional MSPs (UK typically £40-£90/user) and still run ~60% gross margin before engineer time, with almost no staff. |

## 3. Scope: what we can deliver automatically

The machine-readable version lives in [`shared/catalog.json`](../shared/catalog.json). The website and every agent read prices from it, so a price change happens in one place.

| Service | Automation | How it's automated | Human involvement |
|---|---|---|---|
| 24/7 AI helpdesk (WhatsApp, email, portal) | **Full** | Support agent + runbooks + RMM actions | Escalations only |
| Patching (OS + third-party apps) | **Full** | RMM policies (e.g. Action1, NinjaOne or Tactical RMM) | Failed-patch review weekly |
| EDR / antivirus | **Full** | Managed EDR (e.g. Defender for Business, SentinelOne, Huntress) auto-quarantine | P1 incidents |
| Monitoring + self-healing | **Full** | RMM scripts: disk clean, spooler restart, service restarts | Hardware faults |
| M365 / Google Workspace admin | **High** | Graph API / Admin SDK: starter/leaver, MFA enforcement, licence clean-up | Approvals |
| Cloud backup + restore tests | **Full** | M365/Google backup SaaS with automated restore verification | Real restores |
| Domain and email health (SPF/DKIM/DMARC) | **High** | DNS audit (built) + DMARC report parsing | Initial DNS changes |
| Phishing training | **Full** | Training SaaS with monthly auto-enrolment | None |
| Cyber Essentials / GDPR readiness | **Partial** | Evidence gathering from RMM + policy templates | Engineer sign-off |
| Monthly health report | **High** | Digest agent writes plain-English reports from RMM data | Quarterly call on Siesta |
| On-site (Costa Blanca direct, UK partners) | **Human** | Dispatch and booking automated | The visit itself |

**What we deliberately don't sell:** server rooms, bespoke development, 24/7 manned NOC, line-of-business app support beyond "best effort". Those kill margins and automation.

## 4. Pricing

All prices are per user per month, ex VAT (UK 20%) or IVA (Spain 21%). Minimum 3 users. Monthly rolling, or 12 months with onboarding free and 2 months off.

| Plan | UK | Costa Blanca | Response | Key inclusions |
|---|---|---|---|---|
| **Calma** (Protected and patched) | **£19** | **€22** | Same business day | AI helpdesk, patching, EDR, monitoring, password manager, monthly report. Engineer time at the Rescue rate. |
| **Tranqui** ⭐ (Fully looked after) | **£35** | **€39** | 4 business hours | + unlimited remote engineers, M365/Google management, backup, starter/leaver automation, email security + DMARC, phishing training |
| **Siesta** (Sleep-easy) | **£55** | **€62** | 1 business hour | + Cyber Essentials/GDPR readiness, dark-web monitoring, laptop backup, quarterly review, 2 on-site visits a year (CB), hardware lifecycle |
| **Rescue** (pay as you go) | £45 for the first 30 min | €49 for the first 30 min | Best effort | No contract; the AI triages for free first |

**Add-ons:** server/NAS monitoring £25/€29 per device; extra device backup £5/€6; website care £29/€32; DMARC fix £149/€165 one-off; Cyber Essentials pack £495 + IASME fee; migrations £49/€55 per mailbox; laptop build £99/€110; on-site (Costa Blanca) €65/hr.

**Onboarding:** £99 + £10/user (€110 + €11/user), waived on annual.
**Guarantee:** miss our response time twice in a month and that month is free. It's cheap to offer because the AI responds in seconds.

### Unit economics (estimates: validate with real supplier quotes)

| Per user / month | Calma | Tranqui | Siesta |
|---|---|---|---|
| Price | £19 | £35 | £55 |
| RMM + patching | £1.50 | £1.50 | £1.50 |
| EDR | £2.50 | £2.50 | £3.50 |
| Password manager | £2.50 | £2.50 | £2.50 |
| Backup (M365/Google + device) | – | £2.00 | £5.00 |
| Email security, DNS filtering, training | – | £3.00 | £4.00 |
| Dark-web monitoring, compliance tooling | – | – | £1.50 |
| AI (Claude) + messaging + hosting | £0.75 | £1.25 | £1.50 |
| Human engineer time (~5 / 12 / 20 min at £30/hr) | £2.50 | £6.00 | £10.00 |
| **Gross margin** | **~£9.25 (49%)** | **~£16.25 (46%)** | **~£25.50 (46%)** |
| Gross margin excluding your own time | ~62% | ~63% | ~65% |

Rules of thumb:

- **Break-even on £5k/month of gross profit** is about 300 users, roughly 50 clients of 6 people on a Tranqui/Calma mix.
- **The AI must resolve at least 70% of tickets without a human.** The daily digest tracks this number (`resolvedByAi`).
- **Each extra minute of human time per user per month costs about 1.5% of margin.** Automate the top 5 ticket types first.

## 5. Go-to-market by region

| | UK (cold outreach) | Costa Blanca |
|---|---|---|
| **Primary channel** | Personalised cold email to **limited companies and LLPs only** (PECR), led by a free DMARC/health finding | **Warm channels only.** Spain's LSSI art. 21 bans unsolicited commercial email, B2B included. |
| **Lead sources** | Companies House (sector SIC codes + location) and the Google Places API | Google Places API (niche × town), referrals, inbound |
| **Hook** | "Your domain has no DMARC, so anyone can send email as you. Here's a 2-minute fix or we'll do it." | "British-run IT that speaks fluent Movistar." |
| **Supporting channels** | LinkedIn (manual connection notes drafted by the agent), letters to sole traders, social | **Google Business Profile** (huge locally), letters/postcards, partnerships (gestorías, estate agents, Chambers of Commerce, expat clubs), Facebook expat groups (manual, helpful posts), social, local radio/print (Sur in English, The Olive Press, Costa Blanca People) |
| **Conversion** | Free health check → 15-min call → quote (the agent can quote) | Same, plus free on-site visit for 10+ users |

## 6. Operating model

```
               ┌────────────── shared/catalog.json (services, prices, terms) ──────────────┐
               │                                                                            │
 Website (Next.js) ── /api/check ─┐                                                        │
   chat widget ─────── /api/enquiry ──► Inbound agent ── quotes / bookings / Rescue ──► Owner alerts
   support portal ──── /api/portal ──► Support agent ── runbooks / RMM actions / SLAs ──► Engineer escalation
 WhatsApp Cloud API ── /webhooks/whatsapp ─┘ (customers → support, everyone else → inbound)
 Inbound email ─────── /webhooks/email ────┘
 Scheduler: Prospector (06:00) → Enrichment (06:30) → Outreach (Tue-Thu 09:15 UK) → Approval queue
            Social planner (Fri) → Approval queue → Publisher (every 15 min) → IG / FB / TikTok
            SLA watcher (10 min) · Morning digest (07:30)
```

**People.** At launch it's you plus the agents. Hire or contract the first part-time engineer at about 150 users. Sign one Costa Blanca on-site contractor and one UK partner (via a white-label MSP network) before launch.

**Two modes.**

- `OUTBOUND_MODE=review` is the default. Every cold email and social post waits in the approval queue. Run this for the first 4-6 weeks.
- `autopilot` lets them send automatically once you trust the output.

## 7. KPIs (in the morning digest)

| Funnel | Target |
|---|---|
| Leads discovered → enriched → fit ≥ 60 | 300 → 200 → 80 per week |
| Cold email reply rate | 5-8% (positive 2-3%) |
| Health checks → calls → customers | 30% → 35% |
| AI first-contact resolution | ≥ 70% |
| Median first response | < 1 minute |
| CSAT | ≥ 4.6 / 5 |
| Logo churn | < 1.5% / month |

## 8. 90-day launch plan

**Weeks 1-2: foundations**

- Register the name and domains. Set up the company, VAT, bank, Stripe/GoCardless and insurance (cyber + professional indemnity).
- Get legal reviews of the DPA, terms and privacy notice.
- Choose the stack: RMM, EDR, backup, password manager, training. Sign up as an MSP partner for each.
- WhatsApp Business Platform: verify the business and number, and get the `owner_alert` + ticket-update templates approved.
- Warm up 2 outreach inboxes on separate domains (SPF/DKIM/DMARC, 3-4 weeks).

**Weeks 3-4: soft launch**

- Deploy ops + web (e.g. Fly.io/Render + Vercel).
- Migrate existing patchingguy.com customers onto Tranqui (see [migration](05-patchingguy-migration.md)).
- Write 15 runbooks from real tickets.
- Run in `review` mode. Approve every email and post, and correct the prompts.

**Weeks 5-8: outbound on**

- UK: 30-40 emails/day/inbox across 2 inboxes, 2 sectors at a time.
- Costa Blanca: GBP posts weekly, 50 letters/week, 5 partnership meetings.

**Weeks 9-12: scale what works**

- Double down on the best sector.
- Switch social to autopilot.
- Add the next automations from the [gap list](03-gaps-and-extra-automation.md): billing, onboarding, review requests.
