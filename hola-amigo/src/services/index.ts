// The one place that decides which backend the app talks to.
//
//   VITE_BACKEND=local     (default) everything stays on this device
//   VITE_BACKEND=firebase  Firebase accounts + cloud sync (see FIREBASE_SETUP.md)
//
// The Firebase SDK is only downloaded when the cloud backend is switched on.
import { BACKEND } from "../config.ts";
import { createLocalServices } from "./local.ts";
import type { Services } from "./types.ts";

export type * from "./types.ts";

const impl: Promise<Services> = BACKEND === "firebase"
  ? import("./firebase.ts").then(m => m.createFirebaseServices())
  : Promise.resolve(createLocalServices());

// Each method waits for the backend to be ready, then calls through.
function deferred<K extends Exclude<keyof Services, "kind">>(key: K): Services[K] {
  return new Proxy({} as Services[K], {
    get: (_target, method: string) => (...args: unknown[]) =>
      impl.then(s => (s[key] as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args)),
  });
}

export const services: Services = {
  kind: BACKEND === "firebase" ? "cloud" : "local",
  auth: deferred("auth"),
  family: deferred("family"),
  progress: deferred("progress"),
  session: deferred("session"),
};
