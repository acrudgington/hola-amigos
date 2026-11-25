// The real Firebase services, end to end against the local Auth + Firestore emulators.
// Run with: npm run test:emulators
import { describe, expect, it } from "vitest";
import { createFirebaseServices } from "../src/services/firebase.ts";

const consent = { version: "2026-11-24-draft", acceptedAt: Date.now() };
let n = 0;
const fresh = () => createFirebaseServices({
  apiKey: "demo-key", authDomain: "localhost", projectId: "demo-hola-amigos", appId: "demo-app", appName: `device-${++n}`,
  emulatorHost: "127.0.0.1", persistence: false, saveDelayMs: 10,
});
const email = () => `parent${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;

describe("cloud services (emulator)", () => {
  it("signs up, adds a child, saves and reloads progress", async () => {
    const s = fresh();
    const mail = email();
    const res = await s.auth.signUp("Sam", mail, "secret123", consent);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parent.plan).toBe("free");
    expect(res.parent.consent?.version).toBe(consent.version);

    const kid = await s.family.addChild(res.parent.id, "Mia", "🦊");
    const p = await s.progress.load(kid.id);
    p.xp = 42;
    p.stars["1"] = 3;
    await s.progress.save(kid.id, p);
    await new Promise(r => setTimeout(r, 300));
    await s.auth.logOut();

    // A second device logs in and sees the same family.
    const other = fresh();
    const again = await other.auth.logIn(mail, "secret123");
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    const kids = await other.family.listChildren(again.parent.id);
    expect(kids.map(k => k.name)).toEqual(["Mia"]);
    const loaded = await other.progress.load(kids[0].id);
    expect(loaded.xp).toBe(42);
    expect(loaded.stars["1"]).toBe(3);

    const exported = await other.family.exportData(again.parent.id);
    expect(exported.children).toHaveLength(1);
    await other.auth.logOut();
  });

  it("gives friendly errors and doesn't reveal accounts", async () => {
    const s = fresh();
    const bad = await s.auth.logIn(email(), "nope-nope");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/don’t match/);
    expect((await s.auth.resetPassword(email())).ok).toBe(true);
  });

  it("deleting the account removes everything", async () => {
    const s = fresh();
    const mail = email();
    const res = await s.auth.signUp("Sam", mail, "secret123", consent);
    if (!res.ok) throw new Error(res.error);
    await s.family.addChild(res.parent.id, "Leo", "🐼");
    expect((await s.auth.deleteAccount("wrong-password")).ok).toBe(false);
    expect((await s.auth.deleteAccount("secret123")).ok).toBe(true);
    const again = await fresh().auth.logIn(mail, "secret123");
    expect(again.ok).toBe(false);
  });
});
