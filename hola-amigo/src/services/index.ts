// The one place that decides which backend the app talks to.
import { BACKEND } from "../config.ts";
import { createLocalServices } from "./local.ts";
import type { Services } from "./types.ts";

export type * from "./types.ts";

function create(): Services {
  if (BACKEND === "firebase") {
    // Added in step 2. Until then, fall back to on-device storage.
    console.warn("VITE_BACKEND=firebase is not available yet — using on-device storage.");
  }
  return createLocalServices();
}

export const services: Services = create();
