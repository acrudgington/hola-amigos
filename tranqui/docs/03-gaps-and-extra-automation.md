# What your brief missed, and what else can be automated

Your brief covers the **front of the funnel**:

- finding customers
- outbound
- inbound WhatsApp and email
- support
- social
- a website

A profitable, "entirely automated" IT business also needs the **middle and back**: onboarding, billing, security alerts, retention and the legal plumbing. Below are the gaps, ranked by impact. ⚠️ marks things that are risky to skip.

## A. Critical gaps (handle before launch)

1. ⚠️ **Cold email is illegal in Spain, and partly illegal in the UK.**
   - Spain's LSSI art. 21 bans unsolicited commercial email without prior consent, *including B2B*. That rules out cold-emailing the Costa Blanca.
   - Under UK PECR you may cold-email **limited companies and LLPs**, but **not sole traders or ordinary partnerships**, and many small British businesses are exactly those.
   - **What I built:** the outreach agent enforces both rules (`ops/src/compliance.ts`), with unit tests. Costa Blanca and UK sole traders get letters, LinkedIn notes, partnerships and inbound instead. See [compliance](04-compliance.md).
2. ⚠️ **WhatsApp can't be used for cold outreach.** Meta requires opt-in before a business messages first, and replies outside 24 hours must use pre-approved templates.
   - **What I built:** the WhatsApp agent is inbound-only. Owner alerts use a template.
3. ⚠️ **"Entirely automated" still needs people for some things.** On-site work, hardware, P1 security incidents, and anything touching passwords or money need a human or a verified process.
   - **What I built:** escalation paths, identity checks on sensitive actions, and a review mode for outbound.
   - **What you need:** an on-site partner in each region and a named on-call engineer, even if that's you at first.
4. ⚠️ **Legal entity and tax for two countries.**
   - Decide on a UK Ltd selling cross-border (B2B reverse charge) versus a Spanish SL or autónomo for Costa Blanca clients.
   - Spanish customers often expect a Spanish invoice/NIF and SEPA direct debit.
   - Get advice from a cross-border accountant.
5. ⚠️ **Insurance and contracts.** You need professional indemnity and cyber liability cover (MSPs are prime ransomware targets because one breach hits every client), a Master Services Agreement, a GDPR Data Processing Agreement (customers are controllers, you're the processor) and a sub-processor list that includes your AI provider.
6. ⚠️ **Your own security.** An MSP's RMM is a master key to every client. You need hardware security keys for all admin accounts, conditional access, RMM 2FA, least-privilege API tokens, and to keep the `ADMIN_TOKEN` and Meta and RMM credentials in a secrets manager.

## B. High-value automations to add next

| # | Automation | Why it matters | How |
|---|---|---|---|
| 1 | **Onboarding autopilot** | Removes the most manual week in an MSP's life | Quote accepted → e-sign MSA + DPA (Documenso/DocuSign) → GoCardless/Stripe SEPA mandate → per-client RMM installer link → M365 GDAP/Google admin consent → welcome WhatsApp + email → health baseline report on day 7 |
| 2 | **Billing and collections** | Seat creep is lost revenue | Nightly sync of seat counts from M365/Google/RMM → Stripe subscriptions → VAT/IVA + reverse charge → dunning agent (friendly WhatsApp nudge, then suspend) → Xero/Holded |
| 3 | **Security alert triage agent** | EDR/RMM alerts at 3am | Webhook from EDR/RMM → agent classifies → auto-remediate known patterns (isolate device, kill process, revoke sessions) → ticket → wake a human only on P1 |
| 4 | **Monthly customer health reports + upsell** | Retention and expansion | Agent turns RMM, backup and training data into a 1-page PDF with a health score and next upgrade ("3 laptops are 6 years old") |
| 5 | **Reviews and referrals** | Social proof is your biggest gap at launch | After a CSAT of 5, auto-send a Google review link. After 60 days, a referral offer (1 month free for both) |
| 6 | **Google Business Profile agent** | #1 local channel on the Costa Blanca | Weekly GBP posts, Q&A, review replies (drafted, approved) for "IT support Jávea/Benidorm/Torrevieja" searches |
| 7 | **Social inbox (DMs + comments)** | Social will generate DMs, especially "CHECK" replies | Meta webhooks for Instagram/Messenger DMs → route into the existing inbound agent (same code path as WhatsApp) |
| 8 | **AI voice receptionist** | Many older expat owners *phone* | A phone number with an AI voice agent (e.g. Twilio + a speech layer) that uses the same tools, plus voicemail transcription → ticket |
| 9 | **Self-improving knowledge base** | Raises AI resolution rate over time | Weekly job: cluster resolved tickets → draft new runbooks → you approve → added to `kb.ts`/DB |
| 10 | **Renewals and lifecycle** | Prevents embarrassing outages | Watch domain, SSL and licence expiry, warranty end dates and hardware age → automatic reminders and quotes |
| 11 | **SEO content engine** | Compounding inbound, and the legal channel for Spain | 2 articles/month in English + Spanish ("How to stop Correos SMS scams", "DMARC explained for estate agents") from the social agent's research |
| 12 | **Partnership agent (Costa Blanca)** | Gestorías, estate agents and expat associations each refer dozens of businesses | Builds the partner list, drafts personalised partnership letters, tracks referrals and commission |
| 13 | **Owner cockpit** | The approval queue needs a friendly UI on your phone | Small admin web app (or a WhatsApp approve/reject flow for you: "Reply 1 to send, 2 to edit") |
| 14 | **On-site dispatch** | Costa Blanca visits | Cal.com booking with region-based routing; job sheet + photos; auto-invoice of hours |
| 15 | **Hardware procurement** | Margin and stickiness | Agent quotes from distributor price lists, builds the laptop with Autopilot/zero-touch, ships it |
| 16 | **Churn early-warning** | Retention | Ticket spikes, CSAT drops, unpaid invoices, or no logins → retention task for you |

## C. Quality and safety of the AI itself (often missed)

- **Evals.** Keep 50-100 real (anonymised) conversations per agent as a test set. Re-run them whenever you change prompts or models.
- **Transcript review.** Spend 15 minutes a week skimming random AI conversations. The digest already flags refusals and failures.
- **Fallbacks.** If the AI or an API is down, auto-reply "We've got your message, an engineer will reply shortly" and alert you.
- **Disclosure.** The agents state they're AI when asked, as the brand voice requires. The EU AI Act transparency rules (Aug 2026) and UK consumer law point the same way.
- **Cost control.** Track tokens per ticket in the `events` table. Haiku/Sonnet-class models can take bulk enrichment later if cost matters, but measure quality first.

## D. Brand and assets you'll want

- Logo files (an SVG mark is in `web/components/Logo.tsx`), a WhatsApp profile image and a Google Business Profile cover. The social renderer already uses the brand palette.
- A Spanish version of the website (`/es`). Layout metadata already declares `es-ES`; the copy needs translating.
- Real testimonials and case studies once you have them. The site deliberately shows **no** fake reviews or logos.
