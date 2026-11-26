// ============================================================
// Storage & account service contracts.
// Screens and the app shell only talk to these interfaces, never to
// localStorage or Firebase directly. Every method is async so a cloud
// backend can be dropped in without changing any UI code.
// ============================================================
import type { Progress } from "../domain/progress.ts";
import { FAMILY } from "../config.ts";

// What the parent agreed to at sign-up (privacy notice + terms), and when.
export interface Consent { version: string; acceptedAt: number }
export type Plan = "free" | "monthly" | "yearly";
export interface Parent { id: string; email: string; name: string; created: number; consent?: Consent; plan: Plan }
// A learner profile on the family account: a child, or a grown-up (parent) learner.
export type LearnerKind = "child" | "adult";
export interface Child { id: string; parentId: string; name: string; avatar: string; created: number; kind: LearnerKind }
export interface Session { parentId: string; activeChildId: string | null }

export type AuthResult = { ok: true; parent: Parent } | { ok: false; error: string };
export type Outcome = { ok: true } | { ok: false; error: string };

// Everything held about a family, for the parent's "download my data".
export interface FamilyExport {
  exportedAt: string;
  parent: Parent;
  children: { child: Child; progress: Progress }[];
}

export interface AuthService {
  signUp(name: string, email: string, password: string, consent: Consent): Promise<AuthResult>;
  logIn(email: string, password: string): Promise<AuthResult>;
  logOut(): Promise<void>;
  // The signed-in parent (restored on app start), or null.
  current(): Promise<Parent | null>;
  // Email a password-reset link. Always "ok" for unknown emails (so accounts can't be probed).
  resetPassword(email: string): Promise<Outcome>;
  // Permanently delete the login and every child's data. Needs the password again.
  deleteAccount(password: string): Promise<Outcome>;
}

export interface FamilyService {
  listChildren(parentId: string): Promise<Child[]>;
  // Throws FamilyFullError when the account already has the maximum of that kind.
  addChild(parentId: string, name: string, avatar: string, kind?: LearnerKind): Promise<Child>;
  removeChild(childId: string): Promise<void>;
  updateChild(childId: string, changes: { name?: string; avatar?: string }): Promise<Child | null>;
  getChild(childId: string): Promise<Child | null>;
  exportData(parentId: string): Promise<FamilyExport>;
}

export interface ProgressStore {
  load(childId: string): Promise<Progress>;
  // Saves are fire-and-forget from the UI's point of view; implementations
  // should coalesce rapid writes.
  save(childId: string, progress: Progress): Promise<void>;
}

export interface SessionStore {
  get(): Promise<Session | null>;
  set(session: Session | null): Promise<void>;
}

export interface Services {
  // "local": everything on this device. "cloud": Firebase accounts, synced across devices.
  kind: "local" | "cloud";
  auth: AuthService;
  family: FamilyService;
  progress: ProgressStore;
  session: SessionStore;
}

export class FamilyFullError extends Error {
  constructor(public kind: LearnerKind, public max: number) {
    super(kind === "adult" ? `A family account has room for ${max} grown-up learners.` : `A family account has room for ${max} children.`);
    this.name = "FamilyFullError";
  }
}

// Room left on the account for another learner of this kind.
export const roomFor = (existing: Pick<Child, "kind">[], kind: LearnerKind) => {
  const max = kind === "adult" ? FAMILY.maxAdults : FAMILY.maxChildren;
  return Math.max(0, max - existing.filter(c => c.kind === kind).length);
};
export function assertRoom(existing: Pick<Child, "kind">[], kind: LearnerKind) {
  if (!roomFor(existing, kind)) throw new FamilyFullError(kind, kind === "adult" ? FAMILY.maxAdults : FAMILY.maxChildren);
}
