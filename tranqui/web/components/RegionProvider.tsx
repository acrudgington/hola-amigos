"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Region } from "@/lib/catalog";

const Ctx = createContext<{ region: Region; setRegion: (r: Region) => void }>({ region: "UK", setRegion: () => {} });

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<Region>("UK");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tranqui-region") as Region | null;
      if (saved) return setRegionState(saved);
    } catch {}
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Europe/Madrid" || navigator.language.startsWith("es")) setRegionState("Costa Blanca");
  }, []);
  const setRegion = (r: Region) => {
    setRegionState(r);
    try { localStorage.setItem("tranqui-region", r); } catch {}
  };
  return <Ctx.Provider value={{ region, setRegion }}>{children}</Ctx.Provider>;
}
export const useRegion = () => useContext(Ctx);
