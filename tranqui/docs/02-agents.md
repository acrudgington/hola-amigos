# The agents

All agents live in [`ops/`](../ops) and call Claude through the Anthropic SDK's tool runner (`ops/src/llm.ts`). Each agent has:

- a cached system prompt (brand voice + full catalogue)
- a small set of typed tools (Zod schemas)
- hard-coded guardrails for anything legal, financial or security-sensitive

**Model.** `claude-opus-5-5` by default (`TRANQUI_MODEL`). Effort is tuned per agent: `low` for chat and research, `medium` for writing and support. A server-side refusal fallback is enabled.

| Agent | File | Trigger | What it does | Tools | Guardrails |
|---|---|---|---|---|---|
| **Prospector** | `agents/prospector.ts` | Cron 06:00 (discover), 06:30 (enrich) | Finds businesses via the **Companies House API** and **Google Places API** (official APIs, no scraping). Runs a passive DNS/website audit, reads the business's own site, then scores fit and "British-run" likelihood. | Web fetch, web search (Anthropic server tools), DNS audit | Never guesses emails. Never reports DNS findings if lookups failed. Suppressed domains are skipped. |
| **Outreach** | `agents/outreach.ts` | Cron Tue-Thu 09:15 UK | Writes a 3-step personalised sequence (day 0, 4, 10) led by a real finding (e.g. missing DMARC). Where email isn't lawful, it drafts a **letter and a LinkedIn note** for you instead. | – | `compliance.ts` decides the channel: email only for UK Ltd/LLP/PLC, never Spain, never WhatsApp. Daily send cap. Opt-out footer and List-Unsubscribe header. `review` mode queues everything for approval. |
| **Inbound** (WhatsApp + email + website chat) | `agents/inbound.ts` | Webhooks | Answers new enquiries, qualifies them, quotes exact prices, sends the booking link, opens paid **Rescue** tickets for emergencies, and alerts you. Existing customers are routed to Support automatically. | `get_quote` (deterministic maths), `save_lead_details`, `booking_link`, `open_rescue_ticket`, `escalate_to_human`, `opt_out` | Opt-outs are honoured *before* any model call. Prices come only from the quote tool. Discloses it's an AI when asked. Never takes card details. |
| **Support** (replaces the patchingguy.com portal) | `agents/support.ts` | Portal, WhatsApp, email (`[#123]` in the subject) | First-line engineer. Triages, follows runbooks, runs safe remote actions, sets priority/SLA, escalates, closes and collects CSAT. | `search_runbooks`, `remote_action`, `update_ticket`, `escalate` | Sensitive actions (password/MFA reset, sign-out, block, isolate) require a verified registered contact. Never asks for passwords. P1 security incidents escalate immediately. SLA watcher every 10 min. |
| **Social** | `agents/social.ts` | Cron Fri 11:00 (plan); every 15 min (publish) | Researches current scams/tips and writes 4 posts a week across 6 content pillars. Renders branded 1080×1350 carousels (`channels/render.ts`) and publishes to **Instagram, Facebook and TikTok** (photo mode). | Web search | Factual claims need a cited source. Approval queue in review mode. One soft CTA per post max. |
| **Morning digest** | `agents/digest.ts` | Cron 07:30 | Emails you: what needs you now, numbers, pipeline, risks, AI resolution rate, CSAT, failures. | – | – |

## Approval queue

`GET /admin/approvals` lists pending items (outreach emails, letters, social posts).

`POST /admin/approvals/:id/approve` (optionally with an edited JSON body) or `/reject`.

Both need `Authorization: Bearer $ADMIN_TOKEN`. A quick way to work through the queue from your phone is a tiny admin page or an Airtable/Retool front end. That's on the [gap list](03-gaps-and-extra-automation.md).

## Running it

```bash
cd ops
cp .env.example .env    # fill in keys
npm install
npm test                # 8 unit tests: compliance, quotes, webhooks, auth
npm run dev             # API + scheduler on :8787
```

Run any agent by hand:

```bash
npm run agent -- discover --region=cb
npm run agent -- discover --region=uk --location="Guildford" --sector=accountancy
npm run agent -- enrich --limit=10
npm run agent -- outreach --limit=5
npm run agent -- social-plan --posts=4
npm run agent -- quote --plan=tranqui --users=6 --region=cb --annual=true
npm run agent -- chat-sales --text="How much for 8 people in Altea?"
npm run agent -- chat-support --from=sue@client.co.uk --text="Printer says offline"
npm run agent -- import-tickets --file=patchingguy-export.csv
```

## External accounts you need

| Purpose | Service | Notes |
|---|---|---|
| AI | Anthropic API key | `ANTHROPIC_API_KEY` |
| UK leads | Companies House API (free) | `COMPANIES_HOUSE_API_KEY` |
| Leads (both) | Google Places API (New) | `GOOGLE_PLACES_API_KEY`; Text Search Pro SKU |
| Outreach email | Google Workspace or M365 mailbox on a **separate warmed domain** | `OUTREACH_SMTP_URL` |
| Support/transactional email + inbound parsing | Postmark (or Resend/Mailgun) | Inbound webhook → `/webhooks/email?key=…` |
| WhatsApp | Meta WhatsApp Business Platform (Cloud API) | Webhook → `/webhooks/whatsapp`; approve `owner_alert` template |
| Instagram + Facebook | Meta app with `instagram_content_publish` + `pages_manage_posts` | Needs Meta app review |
| TikTok | TikTok for Developers: Content Posting API | Posts are private until the app passes TikTok's audit; verify your media domain |
| RMM / identity | Action1, NinjaOne, Tactical RMM + Microsoft Graph | Wire into `ops/src/rmm.ts` (currently simulated) |
| Booking | Cal.com | `BOOKING_URL` |
