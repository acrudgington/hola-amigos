import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "tranqui-")), "test.db");
process.env.ADMIN_TOKEN = "test-admin";

const { allowedColdChannels, looksLikeOptOut, suppress, isSuppressed } = await import("../src/compliance.js");
const { quote } = await import("../src/agents/inbound.js");
const { parseWebhook } = await import("../src/channels/whatsapp.js");
const { unsubscribeToken } = await import("../src/channels/email.js");
const { searchKb } = await import("../src/kb.js");
const { catalogForPrompt } = await import("../src/catalog.js");
const { app } = await import("../src/server.js");

test("PECR/LSSI: cold email only to UK corporate subscribers", () => {
  assert.ok(allowedColdChannels({ region: "UK", entity_type: "ltd" }).includes("email"));
  assert.ok(allowedColdChannels({ region: "UK", entity_type: "llp" }).includes("email"));
  assert.ok(!allowedColdChannels({ region: "UK", entity_type: "sole_trader" }).includes("email"));
  assert.ok(!allowedColdChannels({ region: "UK", entity_type: "unknown" }).includes("email"));
  assert.ok(!allowedColdChannels({ region: "Costa Blanca", entity_type: "sl" }).includes("email"));
  for (const r of ["UK", "Costa Blanca"]) assert.ok(!allowedColdChannels({ region: r, entity_type: "ltd" }).includes("whatsapp"));
});

test("opt-out detection in English and Spanish", () => {
  assert.ok(looksLikeOptOut("Please remove me from your list"));
  assert.ok(looksLikeOptOut("No thanks"));
  assert.ok(looksLikeOptOut("Quiero darme de baja"));
  assert.ok(!looksLikeOptOut("Yes, can we talk on Thursday?"));
});

test("suppression covers addresses and whole domains", () => {
  suppress("boss@acme.co.uk", "test");
  assert.ok(isSuppressed("boss@acme.co.uk"));
  suppress("example.org", "test");
  assert.ok(isSuppressed("anyone@example.org"));
  assert.ok(!isSuppressed("someone@else.com"));
});

test("quotes are deterministic and respect minimum seats", () => {
  const q = quote("tranqui", 2, "UK");
  assert.equal(q.seats, 3);
  assert.equal(q.monthly, "£105");
  assert.equal(q.onboarding, "£129");
  const a = quote("siesta", 10, "Costa Blanca", true);
  assert.equal(a.monthly, "€620");
  assert.equal(a.onboarding, "€0");
  assert.equal(a.firstYear, "€6200");
});

test("WhatsApp webhook parsing", () => {
  const msgs = parseWebhook({ entry: [{ changes: [{ value: { contacts: [{ wa_id: "34600111222", profile: { name: "Sue" } }], messages: [{ from: "34600111222", id: "wamid.1", type: "text", text: { body: "Hola!" } }] } }] }] });
  assert.deepEqual(msgs, [{ from: "34600111222", name: "Sue", text: "Hola!", id: "wamid.1", type: "text" }]);
});

test("runbook search finds relevant fixes", () => {
  assert.equal(searchKb("my printer is offline")[0].id, "printer");
  assert.equal(searchKb("I clicked a phishing link")[0].id, "phishing");
});

test("catalogue renders for prompts with prices", () => {
  const p = catalogForPrompt();
  assert.match(p, /Calma/);
  assert.match(p, /£35/);
});

test("server: health, unsubscribe, admin auth", async () => {
  assert.equal((await app.request("/health")).status, 200);
  const bad = await app.request("/u?e=a@b.com&t=nope");
  assert.equal(bad.status, 400);
  const ok = await app.request(`/u?e=a@b.com&t=${unsubscribeToken("a@b.com")}`);
  assert.equal(ok.status, 200);
  assert.ok(isSuppressed("a@b.com"));
  assert.equal((await app.request("/admin/approvals")).status, 401);
  assert.equal((await app.request("/admin/approvals", { headers: { authorization: "Bearer test-admin" } })).status, 200);
});
