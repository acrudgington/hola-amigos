// ============================================================
// Storage & account service contracts.
// Screens and the app shell only talk to these interfaces, never to
// localStorage or Firebase directly. Every method is async so a cloud
// backend can be dropped in without changing any UI code.
// ============================================================
import type { Progress } from "../domain/progress.ts";

export interface Parent { id: string; email: string; name: string; created: number }
export interface Child { id: string; parentId: string; name: string; avatar: string; created: number }
export interface Session { parentId: string; activeChildId: string | null }

export type AuthResult = { ok: true; parent: Parent } | { ok: false; error: string };

export interface AuthService {
  signUp(name: string, email: string, password: string): Promise<AuthResult>;
  logIn(email: string, password: string): Promise<AuthResult>;
  logOut(): Promise<void>;
  // The signed-in parent (restored on app start), or null.
  current(): Promise<Parent | null>;
}

export interface FamilyService {
  listChildren(parentId: string): Promise<Child[]>;
  addChild(parentId: string, name: string, avatar: string): Promise<Child>;
  removeChild(childId: string): Promise<void>;
  getChild(childId: string): Promise<Child | null>;
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
  auth: AuthService;
  family: FamilyService;
  progress: ProgressStore;
  session: SessionStore;
}
