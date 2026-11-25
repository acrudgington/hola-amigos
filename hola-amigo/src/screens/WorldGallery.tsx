// All 12 animated worlds at every time of day, for checking the scenes.
// Open the app with #worlds on the end of the address. Not linked for children.
import { useState } from "react";
import { WORLDS } from "../content/index.ts";
import { Cosmos } from "../components/Cosmos.tsx";
import { WorldScene, type Phase } from "../components/WorldScene.tsx";

const PHASES: (Phase | "now")[] = ["now", "dawn", "day", "dusk", "night"];

export function WorldGallery() {
  const [phase, setPhase] = useState<Phase | "now">("now");
  return <div className="app">
    <Cosmos />
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="eyebrow">World lab</div>
      <h1 className="h1" style={{ margin: "4px 0 12px" }}>The {WORLDS.length} worlds</h1>
      <div className="row row--wrap" style={{ gap: 8, marginBottom: 16 }}>
        {PHASES.map(p => <button key={p} type="button" className={`btn btn--sm ${p === phase ? "btn--sun" : "btn--white"}`} onClick={() => setPhase(p)}>{p === "now" ? "Time now" : p}</button>)}
      </div>
      <div className="grid-2" style={{ gap: 16 }}>
        {WORLDS.map(w => <div key={w.id} className="card" style={{ overflow: "hidden" }}>
          <WorldScene world={w} height={170} phase={phase === "now" ? undefined : phase} />
          <div style={{ padding: "10px 14px" }}><b>{w.id}. {w.name}</b> <span className="small muted">· {w.scene}</span></div>
        </div>)}
      </div>
    </div>
  </div>;
}
