# Moving the patchingguy.com support portal to Tranqui

> **Status:** I couldn't inspect patchingguy.com from the build environment (its DNS lookup fails there), so I couldn't see what ticketing software it runs. The plan below works for any portal. Tell me the platform (e.g. osTicket, Freshdesk, Zendesk, HaloPSA, Syncro, Atera, or a WordPress form plugin) and I'll write the exact exporter.

## What replaces it

- **Portal UI:** `tranqui.tech/support` (`web/app/support/page.tsx`). Customers open a ticket and chat with the AI helpdesk live. Each ticket has a private link (`?ticket=ID&t=TOKEN`) for return visits.
- **Backend:** `ops` endpoints `POST /api/portal/tickets`, `GET /api/portal/tickets/:id`, `POST /api/portal/tickets/:id/reply`.
- **Same tickets on every channel:** WhatsApp and email (`[#ID]` in the subject threads back to the ticket).

## Cut-over steps

1. **Inventory.** List current customers, their contacts (email and WhatsApp), plan and devices. Load them with `POST /admin/customers` so the support agent recognises them. Only registered contacts can trigger sensitive actions.
2. **Export tickets** from the old portal as CSV with columns `id,email,name,subject,description,status,created`, then run:

   ```bash
   npm run agent -- import-tickets --file=patchingguy-export.csv
   ```

   Open tickets stay open and closed ones are archived. `external_ref` keeps the old ID.
3. **Email continuity.** Point the old support address (e.g. `support@patchingguy.com`) at the inbound email webhook, or forward it to `help@tranqui.tech`. Nothing gets lost.
4. **Web redirects.** 301 `patchingguy.com/*support*` → `tranqui.tech/support`, and the homepage → `tranqui.tech`. Keep the domain renewed for at least 12 months for trust and SEO.
5. **WhatsApp.** If patchingguy uses a WhatsApp Business *app* number, migrate that number to the WhatsApp Business Platform (Cloud API) under the Tranqui business. Customers keep messaging the same number.
6. **RMM branding.** Rename the agent/tray app and the remote-support banner to Tranqui. Re-issue installers if needed.
7. **Tell customers.** Send a short, friendly email + WhatsApp template: "Patching Guy is now Tranqui: same people, faster help, 24/7 WhatsApp." Include the new portal link and say nothing changes in their contract (check your terms on assignment first).
8. **Parallel run for 2 weeks.** Watch the digest for anything still arriving at the old portal, then switch it off.
