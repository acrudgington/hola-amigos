# Compliance: what the agents are built to respect

*This is a practical summary, not legal advice. Get a UK and a Spanish data-protection/marketing lawyer to sign off before launch.*

## Cold email

| Market | Rule | Tranqui behaviour (`ops/src/compliance.ts`) |
|---|---|---|
| UK: limited companies, LLPs, PLCs ("corporate subscribers") | PECR reg. 22 allows unsolicited B2B marketing email. Identify yourself, give an address, and offer a free, simple opt-out. UK GDPR still applies: you need a legitimate-interest assessment and must give an Art. 14 notice within a month. | ✅ Email allowed. The footer includes the postal address and opt-out link, plus `List-Unsubscribe` one-click headers. Replies like "no thanks / unsubscribe / remove me" are suppressed before any AI call. |
| UK: sole traders and non-LLP partnerships ("individual subscribers") | Prior consent required, like consumers. | ❌ No cold email. Letter/LinkedIn/phone only. |
| UK: unknown entity type | Treat as individual. | ❌ No cold email until Companies House confirms Ltd/LLP. |
| Spain (Costa Blanca) | LSSI art. 21 prohibits unsolicited commercial email/SMS without prior express consent, **B2B included** (exception: existing customers, similar services). | ❌ Never cold email. Letters, partnerships, Google Business Profile, social and inbound only. Check the Lista Robinson before postal campaigns. |
| WhatsApp (both) | Meta Business Messaging Policy: the person must opt in first. Outside the 24-hour window, only approved templates. | ❌ No cold WhatsApp. Inbound only, with templates for alerts and ticket updates. |
| Phone (both) | UK: screen against TPS/CTPS. Spain: the 2022 telecoms law restricts unsolicited calls. | Manual only. Not automated. |

**Suppression.** Opt-outs are permanent and cover the whole domain when needed (`suppression` table). Keep the suppression list even when you delete prospect data.

**Data sources.** Only official APIs: Companies House and Google Places. Nothing that breaks the terms of Google Maps or LinkedIn scraping. The tech audit is passive: public DNS records and the homepage. No port scans and no probing of client systems without a contract.

## GDPR / UK GDPR / LOPDGDD

- **Prospect data** (controller: Tranqui). Lawful basis is legitimate interests. Minimise fields, give an Art. 14 notice (template in `web/app/privacy`), keep 12 months then delete.
- **Customer data** (processor: Tranqui). A signed DPA per customer. List sub-processors: Anthropic (AI), Meta (WhatsApp), your email provider, RMM, backup, and hosting.
- **AI processing.** API data isn't used for model training by default. Confirm the current terms and data retention, and record them in your sub-processor list. Tell users they're talking to an AI.
- **International transfers.** Use providers with UK IDTA / EU SCCs or EU hosting where possible.
- **Security.** Encrypt the database at rest, use a secrets manager for tokens, and restrict admin to hardware-key MFA.

## Platforms

- **Meta (WhatsApp/Instagram/Facebook).** Business verification, display-name approval, template approval, and app review for `instagram_content_publish` and `pages_manage_posts`.
- **TikTok Content Posting API.** Unaudited apps can only post privately (`SELF_ONLY`). Apply for the audit and verify the domain that serves `/media`.
- **Google Places.** Display attributions if you show Places data publicly. Don't store Places content beyond what the terms allow (store the place ID plus your own notes).

## Consumer and advertising

- No fake testimonials, ratings or client logos (UK DMCC Act 2024, CAP Code, Spanish unfair-competition law). The site and agents are instructed never to invent them.
- Prices on the site are ex-VAT for B2B. Say so clearly (done). If you ever sell to consumers (e.g. retired expats), show VAT-inclusive prices.
