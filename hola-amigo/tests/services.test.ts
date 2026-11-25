import { beforeEach, describe, expect, test } from "vitest";
import { createLocalServices } from "../src/services/local.ts";

const CONSENT = { version: "test", acceptedAt: 1 };

// A minimal in-memory localStorage for Node.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, String(v)); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}

beforeEach(() => { (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage(); });

describe("on-device account & storage service", () => {
  test("sign up, log in, wrong password, duplicate email", async () => {
    const s = createLocalServices();
    const up = await s.auth.signUp("Sam", "sam@example.com", "secret123", CONSENT);
    expect(up.ok).toBe(true);
    expect((await s.auth.signUp("Sam", "sam@example.com", "other", CONSENT)).ok).toBe(false);
    expect((await s.auth.logIn("sam@example.com", "nope")).ok).toBe(false);
    expect((await s.auth.logIn("sam@example.com", "secret123")).ok).toBe(true);
    expect((await s.auth.current())?.name).toBe("Sam");
    await s.auth.logOut();
    expect(await s.auth.current()).toBeNull();
  });

  test("passwords are never stored in plain text", async () => {
    const s = createLocalServices();
    await s.auth.signUp("Sam", "sam@example.com", "secret123", CONSENT);
    expect(localStorage.getItem("hola_parents")).not.toContain("secret123");
  });

  test("old plain-text accounts can still log in and are upgraded", async () => {
    localStorage.setItem("hola_parents", JSON.stringify([{ email: "old@example.com", name: "Old", pass: "1234", created: 1, children: [] }]));
    const s = createLocalServices();
    expect((await s.auth.logIn("old@example.com", "1234")).ok).toBe(true);
    const stored = localStorage.getItem("hola_parents")!;
    expect(stored).not.toContain('"pass"');
    expect(stored).toContain("passHash");
  });

  test("children and their progress are stored per child and removed together", async () => {
    const s = createLocalServices();
    const up = await s.auth.signUp("Sam", "sam@example.com", "secret123", CONSENT);
    if (!up.ok) throw new Error("sign-up failed");
    const mia = await s.family.addChild(up.parent.id, "Mia", "🦊");
    const leo = await s.family.addChild(up.parent.id, "Leo", "🐼");
    expect((await s.family.listChildren(up.parent.id)).map(c => c.name)).toEqual(["Mia", "Leo"]);

    const p = await s.progress.load(mia.id);
    await s.progress.save(mia.id, { ...p, xp: 99 });
    expect((await s.progress.load(mia.id)).xp).toBe(99);
    expect((await s.progress.load(leo.id)).xp).toBe(0);

    await s.family.removeChild(mia.id);
    expect((await s.family.listChildren(up.parent.id)).map(c => c.name)).toEqual(["Leo"]);
    expect(localStorage.getItem(`hola_progress_${mia.id}`)).toBeNull();
  });

  test("a parent can download all their data and delete their account", async () => {
    const s = createLocalServices();
    const up = await s.auth.signUp("Sam", "sam@example.com", "secret123", CONSENT);
    if (!up.ok) throw new Error("sign-up failed");
    expect(up.parent.consent).toEqual(CONSENT);
    const mia = await s.family.addChild(up.parent.id, "Mia", "🦊");
    const exported = await s.family.exportData(up.parent.id);
    expect(exported.children.map(c => c.child.name)).toEqual(["Mia"]);
    expect(JSON.stringify(exported)).not.toContain("passHash");
    expect((await s.auth.deleteAccount("wrong")).ok).toBe(false);
    expect((await s.auth.deleteAccount("secret123")).ok).toBe(true);
    expect(localStorage.getItem(`hola_progress_${mia.id}`)).toBeNull();
    expect((await s.auth.logIn("sam@example.com", "secret123")).ok).toBe(false);
  });

  test("the session remembers which child was playing", async () => {
    const s = createLocalServices();
    await s.session.set({ parentId: "sam@example.com", activeChildId: "c_1" });
    expect(await s.session.get()).toEqual({ parentId: "sam@example.com", activeChildId: "c_1" });
  });
});
