# Weekly progress emails

## What works now (no server)

The grown-up dashboard shows a **This week** card for each child, made by
`src/domain/weeklyReport.ts`. It covers the last 7 days: active days, XP,
lessons, practice mixes, stories, chants and Learn together sessions, the new
words the child met, any new "I can…" goals, words to practise, and ideas to
try at home.

- **Email me this report** opens the parent's own email app with the report
  ready to send to their sign-in address. Nothing goes through our servers.
- **Share…** (on phones) and **Copy text** do the same through other apps.

## Sending it automatically every week (not set up)

Sending it automatically needs a server. Nothing below is deployed.

1. **Firebase Blaze plan.** Scheduled Cloud Functions need it. A weekly run
   for a few thousand families stays within the free monthly allowance.
2. **An email service**, for example the Firebase "Trigger Email" extension
   with an SMTP provider (Brevo, Mailgun, Amazon SES). Use a provider with EU
   data processing, and sign its data processing agreement (DPA).
3. **A scheduled function** (`onSchedule("every sunday 18:00", { timeZone: "Europe/Madrid", region: "europe-southwest1" })`):
   - for each parent who opted in, read `parents/{uid}/children/*/progress/current`;
   - build each report with `weeklyReport()` and `reportText()`. They are pure,
     so the same code runs on the server;
   - write a document to the extension's `mail` collection.
4. **Consent and privacy.**
   - Add an opt-in switch, "Email me a weekly report", stored on the parent document. It is off by default.
   - Put an unsubscribe link in every email.
   - Add the email provider to the processors list in the privacy notice
     (`src/legal/privacyNotice.ts`) and bump `PRIVACY.version`.
   - Emails go only to the parent's address, never to children.
