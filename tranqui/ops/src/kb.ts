/**
 * Runbooks the support agent can follow. Add your own: one entry per common fix.
 * Keep steps safe for non-technical users; anything risky belongs to an engineer.
 */
export const RUNBOOKS = [
  { id: "outlook-not-syncing", tags: "outlook email not sending receiving sync stuck outbox", title: "Outlook not sending/receiving",
    steps: "1) Check internet by opening a website. 2) In Outlook, File > Account Settings: look for warnings. 3) Close Outlook fully, reopen. 4) Check Outbox for a large attachment and delete it. 5) Try Outlook on the web (outlook.office.com). If web works but desktop doesn't, we'll repair the profile remotely." },
  { id: "printer", tags: "printer print offline queue stuck not printing", title: "Printer offline / stuck queue",
    steps: "1) Turn the printer off and on. 2) Check it's on the same Wi-Fi. 3) Windows: Settings > Printers, open the queue, cancel all. We can restart the print spooler remotely if that doesn't do it." },
  { id: "wifi", tags: "wifi internet slow no connection router fibre", title: "Wi-Fi / internet problems",
    steps: "1) Is it one device or everyone? 2) Everyone: restart the router (unplug 30s). 3) One device: forget the network and rejoin. 4) Still slow: run speedtest.net and send us the screenshot. Costa Blanca fibre outages are common after storms; check the ISP's status page." },
  { id: "password-reset", tags: "password reset locked out forgot login account mfa authenticator new phone", title: "Password reset / MFA",
    steps: "Verify identity first: the request must come from the user's registered WhatsApp number or email, or be approved by the company admin. Then trigger the reset via the RMM/identity integration and send a one-time link. Never send passwords in chat. For a new phone, re-register MFA via the admin portal." },
  { id: "phishing", tags: "phishing scam suspicious email clicked link gave password hacked fraud invoice", title: "Suspected phishing / clicked a link",
    steps: "Treat as P1 if they entered a password or payment details. Tell them: don't delete the email, disconnect from Wi-Fi if anything downloaded, don't log in anywhere else yet. Escalate to engineer immediately: we reset passwords, revoke sessions and check mailbox rules for forwarding." },
  { id: "slow-pc", tags: "slow computer laptop freezing fan hot disk full", title: "Slow computer",
    steps: "1) Restart (actually restart, not just close the lid). 2) Check free disk space. 3) We can run the remote cleanup and check health data from monitoring. Laptops over 5 years old: suggest replacement." },
  { id: "new-starter", tags: "new starter employee joiner account setup laptop leaver leaving", title: "Starter / leaver",
    steps: "Collect: full name, start date, role, which mailboxes/shared drives, device needed. Only accept from the company admin. Create a ticket assigned to automation; leavers: block sign-in on the leaving date, convert mailbox to shared, wipe device." },
];

export function searchKb(query: string) {
  const q = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return RUNBOOKS.map((r) => ({ r, score: q.filter((w) => r.tags.includes(w) || r.title.toLowerCase().includes(w)).length }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.r);
}
