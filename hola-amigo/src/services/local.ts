// ============================================================
// On-device implementation of the services (localStorage).
// Reads the same keys as earlier versions, so existing families keep
// their accounts and progress when they update.
// ============================================================
import { normalizeProgress, type Progress } from "../domain/progress.ts";
import type { AuthResult, Child, Parent, Services, Session } from "./types.ts";

const KEYS = { parents: "hola_parents", children: "hola_children", session: "hola_session", progress: (id: string) => `hola_progress_${id}` };

interface StoredParent { email: string; name: string; created: number; children: string[]; passHash?: string; pass?: string }
interface StoredChild { id: string; parentEmail: string; name: string; avatar: string; created: number }
interface StoredSession { parentEmail: string; activeChildId: string | null }

const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v == null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
};
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ } };
const remove = (key: string) => { try { localStorage.removeItem(key); } catch { /* ignore */ } };

// Salted SHA-256 (passwords are never stored in plain text). Falls back to
// FNV-1a where Web Crypto isn't available (plain-http LAN testing).
export async function hashPassword(email: string, pass: string): Promise<string> {
  const input = `hola-amigo:${email}:${pass}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `fnv-${(h >>> 0).toString(16)}`;
}

const toParent = (p: StoredParent): Parent => ({ id: p.email, email: p.email, name: p.name, created: p.created });
const toChild = (c: StoredChild): Child => ({ id: c.id, parentId: c.parentEmail, name: c.name, avatar: c.avatar, created: c.created });
const parents = () => read<StoredParent[]>(KEYS.parents, []);
const children = () => read<Record<string, StoredChild>>(KEYS.children, {});

export function createLocalServices(): Services {
  const session = {
    async get(): Promise<Session | null> {
      const s = read<StoredSession | null>(KEYS.session, null);
      return s?.parentEmail ? { parentId: s.parentEmail, activeChildId: s.activeChildId ?? null } : null;
    },
    async set(s: Session | null) {
      if (s) write(KEYS.session, { parentEmail: s.parentId, activeChildId: s.activeChildId } satisfies StoredSession);
      else remove(KEYS.session);
    },
  };

  return {
    session,
    auth: {
      async signUp(name, email, password): Promise<AuthResult> {
        const all = parents();
        if (all.some(p => p.email === email)) return { ok: false, error: "An account with this email already exists — try logging in!" };
        const p: StoredParent = { email, name, created: Date.now(), children: [], passHash: await hashPassword(email, password) };
        write(KEYS.parents, [...all, p]);
        await session.set({ parentId: email, activeChildId: null });
        return { ok: true, parent: toParent(p) };
      },
      async logIn(email, password): Promise<AuthResult> {
        const all = parents();
        const idx = all.findIndex(p => p.email === email);
        if (idx < 0) return { ok: false, error: "No account found with this email." };
        const p = all[idx];
        const hash = await hashPassword(email, password);
        if (p.passHash) {
          if (p.passHash !== hash) return { ok: false, error: "Wrong password! Try again." };
        } else {
          // Very old accounts stored the password in plain text: verify, then upgrade.
          if (p.pass !== password) return { ok: false, error: "Wrong password! Try again." };
          const { pass: _old, ...rest } = p;
          all[idx] = { ...rest, passHash: hash };
          write(KEYS.parents, all);
        }
        await session.set({ parentId: email, activeChildId: null });
        return { ok: true, parent: toParent(all[idx]) };
      },
      async logOut() { await session.set(null); },
      async current() {
        const s = await session.get();
        const p = s ? parents().find(x => x.email === s.parentId) : undefined;
        return p ? toParent(p) : null;
      },
    },
    family: {
      async listChildren(parentId) {
        const p = parents().find(x => x.email === parentId);
        const all = children();
        return (p?.children || []).map(id => all[id]).filter(Boolean).map(toChild);
      },
      async addChild(parentId, name, avatar) {
        const all = parents();
        const idx = all.findIndex(p => p.email === parentId);
        if (idx < 0) throw new Error("Parent account not found");
        const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const c: StoredChild = { id, parentEmail: parentId, name: name.trim(), avatar: avatar || "🦊", created: Date.now() };
        write(KEYS.children, { ...children(), [id]: c });
        all[idx] = { ...all[idx], children: [...(all[idx].children || []), id] };
        write(KEYS.parents, all);
        write(KEYS.progress(id), normalizeProgress(null));
        return toChild(c);
      },
      async removeChild(childId) {
        const all = children();
        const c = all[childId];
        if (!c) return;
        delete all[childId];
        write(KEYS.children, all);
        write(KEYS.parents, parents().map(p => (p.email === c.parentEmail ? { ...p, children: p.children.filter(id => id !== childId) } : p)));
        remove(KEYS.progress(childId));
      },
      async getChild(childId) {
        const c = children()[childId];
        return c ? toChild(c) : null;
      },
    },
    progress: {
      async load(childId) { return normalizeProgress(read<Partial<Progress> | null>(KEYS.progress(childId), null)); },
      async save(childId, p) { write(KEYS.progress(childId), p); },
    },
  };
}
