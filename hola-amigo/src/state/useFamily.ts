import { useCallback, useEffect, useState } from "react";
import { services, type Child } from "../services/index.ts";
import type { Progress } from "../domain/progress.ts";

export interface ChildWithProgress { child: Child; progress: Progress }

// Load a parent's children and each child's progress through the services
// (works the same whether storage is on-device or in the cloud).
export function useFamily(parentId: string) {
  const [family, setFamily] = useState<ChildWithProgress[] | null>(null);
  const reload = useCallback(async () => {
    const kids = await services.family.listChildren(parentId);
    const withProgress = await Promise.all(kids.map(async child => ({ child, progress: await services.progress.load(child.id) })));
    setFamily(withProgress);
  }, [parentId]);
  useEffect(() => { void reload(); }, [reload]);
  return { family, reload };
}
