// ============================================================
// Cloud implementation of the services: Firebase Authentication + Firestore.
// Same contract as the on-device version (./types.ts), so no screen knows
// which one it is talking to.
//
// Data layout (see firestore.rules):
//   parents/{uid}                                    the parent's account record
//   parents/{uid}/children/{childId}                 first name + animal avatar only
//   parents/{uid}/children/{childId}/progress/current
//
// Progress saves are coalesced (one write per child after a short pause, and
// immediately when the app is hidden), and Firestore's offline cache means a
// lesson played without internet syncs the next time the device is online.
// ============================================================
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, getAuth,
  reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signOut, updateProfile, type Auth,
} from "firebase/auth";
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, initializeFirestore, memoryLocalCache,
  persistentLocalCache, persistentMultipleTabManager, setDoc, writeBatch, type Firestore,
} from "firebase/firestore";
import { normalizeProgress, type Progress } from "../domain/progress.ts";
import type { AuthResult, Child, Consent, FamilyExport, Outcome, Parent, Plan, Services, Session } from "./types.ts";

export interface FirebaseSettings {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  // Local emulators for development/tests, e.g. "127.0.0.1".
  emulatorHost?: string;
  // Keep a copy of the family's data on the device for offline use (browser only).
  persistence?: boolean;
  // Delay before a progress change is written (ms).
  saveDelayMs?: number;
  // Name for the Firebase app instance (tests use one per simulated device).
  appName?: string;
}

export function firebaseSettingsFromEnv(): FirebaseSettings {
  const env = import.meta.env;
  const settings = {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
    emulatorHost: (env.VITE_FIREBASE_EMULATOR_HOST as string) || undefined,
    persistence: true,
  };
  const missing = (["apiKey", "authDomain", "projectId", "appId"] as const).filter(k => !settings[k]);
  if (missing.length) throw new Error(`Firebase isn't configured: set ${missing.map(k => `VITE_FIREBASE_${k.replace(/[A-Z]/g, c => `_${c}`).toUpperCase()}`).join(", ")} (see FIREBASE_SETUP.md)`);
  return settings;
}

// Friendly words for Firebase's error codes (never reveal whether an email has an account).
function message(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  switch (code) {
    case "auth/email-already-in-use": return "An account with this email already exists — try logging in!";
    case "auth/invalid-email": return "That email doesn’t look quite right.";
    case "auth/weak-password": return "Please choose a longer password (at least 6 characters).";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "That email and password don’t match. Try again, or reset your password.";
    case "auth/too-many-requests": return "Too many tries. Please wait a few minutes and try again.";
    case "auth/network-request-failed": return "No internet connection. Please check you’re online and try again.";
    case "auth/requires-recent-login": return "For safety, please enter your password again.";
    default: return "Something went wrong. Please try again.";
  }
}

interface ParentDoc { name: string; email: string; created: number; consent: Consent; plan: Plan; schemaVersion: number }

// Firestore rejects `undefined`; progress is plain JSON, so round-trip it.
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function createFirebaseServices(settings: FirebaseSettings = firebaseSettingsFromEnv(), app?: FirebaseApp): Services {
  const fb = app ?? initializeApp({ apiKey: settings.apiKey, authDomain: settings.authDomain, projectId: settings.projectId, appId: settings.appId }, settings.appName ?? `hola-${settings.projectId}`);
  const auth: Auth = getAuth(fb);
  const db: Firestore = initializeFirestore(fb, {
    localCache: settings.persistence && typeof indexedDB !== "undefined"
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
  });
  if (settings.emulatorHost) {
    connectAuthEmulator(auth, `http://${settings.emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, settings.emulatorHost, 8080);
  }

  const uid = () => {
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in");
    return u.uid;
  };
  const parentRef = (id: string) => doc(db, "parents", id);
  const childrenCol = (parentId: string) => collection(db, "parents", parentId, "children");
  const childRef = (parentId: string, childId: string) => doc(db, "parents", parentId, "children", childId);
  const progressRef = (parentId: string, childId: string) => doc(db, "parents", parentId, "children", childId, "progress", "current");

  const toParent = (id: string, d: ParentDoc): Parent => ({ id, email: d.email, name: d.name, created: d.created, consent: d.consent, plan: d.plan || "free" });
  const toChild = (parentId: string, id: string, d: { name: string; avatar: string; created: number }): Child => ({ id, parentId, name: d.name, avatar: d.avatar, created: d.created });

  async function loadParent(id: string): Promise<Parent | null> {
    const snap = await getDoc(parentRef(id));
    return snap.exists() ? toParent(id, snap.data() as ParentDoc) : null;
  }

  // ---------- coalesced progress saves ----------
  const pending = new Map<string, { parentId: string; progress: Progress }>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = async () => {
    if (timer) { clearTimeout(timer); timer = null; }
    const batch = [...pending.entries()];
    pending.clear();
    await Promise.all(batch.map(([childId, { parentId, progress }]) => setDoc(progressRef(parentId, childId), plain(progress))));
  };
  if (typeof document !== "undefined") {
    // Save straight away when the app goes to the background or closes.
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void flush(); });
    window.addEventListener("pagehide", () => { void flush(); });
  }

  // ---------- this device's "who was playing" ----------
  const SESSION_KEY = "hola_cloud_session";
  const session = {
    async get(): Promise<Session | null> {
      await auth.authStateReady();
      const u = auth.currentUser;
      if (!u) return null;
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as Session | null;
        return s && s.parentId === u.uid ? s : { parentId: u.uid, activeChildId: null };
      } catch { return { parentId: u.uid, activeChildId: null }; }
    },
    async set(s: Session | null) {
      try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    },
  };

  return {
    kind: "cloud",
    session,
    auth: {
      async signUp(name, email, password, consent): Promise<AuthResult> {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
          const record: ParentDoc = { name, email: cred.user.email || email, created: Date.now(), consent, plan: "free", schemaVersion: 1 };
          await setDoc(parentRef(cred.user.uid), record);
          void sendEmailVerification(cred.user).catch(() => {});
          await session.set({ parentId: cred.user.uid, activeChildId: null });
          return { ok: true, parent: toParent(cred.user.uid, record) };
        } catch (err) {
          return { ok: false, error: message(err) };
        }
      },
      async logIn(email, password): Promise<AuthResult> {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const parent = await loadParent(cred.user.uid);
          if (!parent) { await signOut(auth); return { ok: false, error: "This account isn’t set up yet. Please sign up again." }; }
          await session.set({ parentId: cred.user.uid, activeChildId: null });
          return { ok: true, parent };
        } catch (err) {
          return { ok: false, error: message(err) };
        }
      },
      async logOut() {
        await flush();
        await session.set(null);
        await signOut(auth);
      },
      async current() {
        await auth.authStateReady();
        const u = auth.currentUser;
        return u ? loadParent(u.uid) : null;
      },
      async resetPassword(email): Promise<Outcome> {
        try {
          await sendPasswordResetEmail(auth, email);
          return { ok: true };
        } catch (err) {
          const code = (err as { code?: string })?.code;
          // Don't reveal whether an account exists.
          if (code === "auth/user-not-found") return { ok: true };
          return { ok: false, error: message(err) };
        }
      },
      async deleteAccount(password): Promise<Outcome> {
        const u = auth.currentUser;
        if (!u || !u.email) return { ok: false, error: "You're not signed in." };
        try {
          await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
          pending.clear();
          const kids = await getDocs(childrenCol(u.uid));
          const batch = writeBatch(db);
          kids.forEach(k => { batch.delete(progressRef(u.uid, k.id)); batch.delete(k.ref); });
          batch.delete(parentRef(u.uid));
          await batch.commit();
          await deleteUser(u);
          await session.set(null);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: message(err) };
        }
      },
    },
    family: {
      async listChildren(parentId) {
        const snap = await getDocs(childrenCol(parentId));
        return snap.docs.map(d => toChild(parentId, d.id, d.data() as { name: string; avatar: string; created: number })).sort((a, b) => a.created - b.created);
      },
      async addChild(parentId, name, avatar) {
        const ref = doc(childrenCol(parentId));
        const data = { name: name.trim(), avatar: avatar || "🦊", created: Date.now() };
        await setDoc(ref, data);
        await setDoc(progressRef(parentId, ref.id), plain(normalizeProgress(null)));
        return toChild(parentId, ref.id, data);
      },
      async updateChild(childId, changes) {
        const parentId = uid();
        const ref = childRef(parentId, childId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const cur = snap.data() as { name: string; avatar: string; created: number };
        const next = { ...cur, ...(changes.name ? { name: changes.name.trim() } : {}), ...(changes.avatar ? { avatar: changes.avatar } : {}) };
        await setDoc(ref, next);
        return toChild(parentId, childId, next);
      },
      async removeChild(childId) {
        const parentId = uid();
        pending.delete(childId);
        await deleteDoc(progressRef(parentId, childId));
        await deleteDoc(childRef(parentId, childId));
      },
      async getChild(childId) {
        await auth.authStateReady();
        if (!auth.currentUser) return null;
        const parentId = uid();
        const snap = await getDoc(childRef(parentId, childId));
        return snap.exists() ? toChild(parentId, snap.id, snap.data() as { name: string; avatar: string; created: number }) : null;
      },
      async exportData(parentId): Promise<FamilyExport> {
        await flush();
        const parent = await loadParent(parentId);
        if (!parent) throw new Error("Parent account not found");
        const kids = await this.listChildren(parentId);
        const children = await Promise.all(kids.map(async child => {
          const snap = await getDoc(progressRef(parentId, child.id));
          return { child, progress: normalizeProgress(snap.exists() ? (snap.data() as Partial<Progress>) : null) };
        }));
        return { exportedAt: new Date().toISOString(), parent, children };
      },
    },
    progress: {
      async load(childId) {
        const pend = pending.get(childId);
        if (pend) return pend.progress;
        const snap = await getDoc(progressRef(uid(), childId));
        return normalizeProgress(snap.exists() ? (snap.data() as Partial<Progress>) : null);
      },
      async save(childId, progress) {
        pending.set(childId, { parentId: uid(), progress });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void flush().catch(err => console.error("Couldn't save progress", err)); }, settings.saveDelayMs ?? 1500);
      },
    },
  };
}
