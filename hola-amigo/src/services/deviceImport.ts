// Bring learners saved on this device (from before cloud accounts) into the
// signed-in parent's cloud account, matched by email address.
import { createLocalServices } from "./local.ts";
import { services } from "./index.ts";
import type { Child } from "./types.ts";

const doneKey = (email: string) => `hola_imported_${email}`;

// Learners on this device under the same email that haven't been imported yet.
export async function findDeviceLearners(email: string): Promise<Child[]> {
  if (services.kind !== "cloud") return [];
  try { if (localStorage.getItem(doneKey(email))) return []; } catch { return []; }
  return createLocalServices().family.listChildren(email);
}

export async function importDeviceLearners(email: string, parentId: string): Promise<number> {
  const local = createLocalServices();
  const kids = await local.family.listChildren(email);
  for (const kid of kids) {
    const progress = await local.progress.load(kid.id);
    const created = await services.family.addChild(parentId, kid.name, kid.avatar);
    await services.progress.save(created.id, progress);
  }
  try { localStorage.setItem(doneKey(email), String(Date.now())); } catch { /* ignore */ }
  return kids.length;
}

export function dismissDeviceLearners(email: string) {
  try { localStorage.setItem(doneKey(email), "dismissed"); } catch { /* ignore */ }
}
