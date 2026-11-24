// Firestore security rules, tested against the local emulator.
// Run with: npm run test:emulators
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { normalizeProgress } from "../src/domain/progress.ts";

let env: RulesTestEnvironment;
const consent = { version: "2026-11-24-draft", acceptedAt: 1 };
const parentDoc = (email: string) => ({ name: "Sam", email, created: 1, consent, plan: "free", schemaVersion: 1 });
const progress = () => JSON.parse(JSON.stringify(normalizeProgress(null)));

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-hola-amigos",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const as = (uid: string, email = `${uid}@example.com`) => env.authenticatedContext(uid, { email }).firestore();

describe("parent records", () => {
  it("a parent can create their own record on the free plan", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "parents/alice"), parentDoc("alice@example.com")));
  });
  it("can't start on a paid plan", async () => {
    await assertFails(setDoc(doc(as("alice"), "parents/alice"), { ...parentDoc("alice@example.com"), plan: "family" }));
  });
  it("can't upgrade their own plan", async () => {
    const db = as("alice");
    await setDoc(doc(db, "parents/alice"), parentDoc("alice@example.com"));
    await assertFails(updateDoc(doc(db, "parents/alice"), { plan: "family" }));
    await assertSucceeds(updateDoc(doc(db, "parents/alice"), { name: "Alice" }));
  });
  it("needs a consent record and a matching email", async () => {
    const { consent: _c, ...noConsent } = parentDoc("alice@example.com");
    await assertFails(setDoc(doc(as("alice"), "parents/alice"), noConsent));
    await assertFails(setDoc(doc(as("alice"), "parents/alice"), parentDoc("someone@else.com")));
  });
  it("rejects unexpected fields", async () => {
    await assertFails(setDoc(doc(as("alice"), "parents/alice"), { ...parentDoc("alice@example.com"), birthday: "2019-01-01" }));
  });
  it("nobody else can read or write it", async () => {
    await setDoc(doc(as("alice"), "parents/alice"), parentDoc("alice@example.com"));
    await assertFails(getDoc(doc(as("bob"), "parents/alice")));
    await assertFails(deleteDoc(doc(as("bob"), "parents/alice")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "parents/alice")));
  });
});

describe("children and progress", () => {
  beforeEach(async () => { await setDoc(doc(as("alice"), "parents/alice"), parentDoc("alice@example.com")); });

  it("a parent can add a child and save progress", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "parents/alice/children/c1"), { name: "Mia", avatar: "🦊", created: 1 }));
    await assertSucceeds(setDoc(doc(db, "parents/alice/children/c1/progress/current"), progress()));
    await assertSucceeds(getDoc(doc(db, "parents/alice/children/c1/progress/current")));
  });
  it("children hold only a short name and an avatar", async () => {
    const db = as("alice");
    await assertFails(setDoc(doc(db, "parents/alice/children/c1"), { name: "Mia", avatar: "🦊", created: 1, school: "X" }));
    await assertFails(setDoc(doc(db, "parents/alice/children/c1"), { name: "x".repeat(21), avatar: "🦊", created: 1 }));
  });
  it("progress lives only at progress/current and must look like progress", async () => {
    const db = as("alice");
    await assertFails(setDoc(doc(db, "parents/alice/children/c1/progress/other"), progress()));
    await assertFails(setDoc(doc(db, "parents/alice/children/c1/progress/current"), { xp: -5 }));
  });
  it("another parent can't see or change the children", async () => {
    await setDoc(doc(as("alice"), "parents/alice/children/c1"), { name: "Mia", avatar: "🦊", created: 1 });
    const bob = as("bob");
    await assertFails(getDoc(doc(bob, "parents/alice/children/c1")));
    await assertFails(setDoc(doc(bob, "parents/alice/children/c2"), { name: "Leo", avatar: "🐼", created: 1 }));
    await assertFails(getDoc(doc(bob, "parents/alice/children/c1/progress/current")));
  });
});
