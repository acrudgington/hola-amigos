// Printable home labels: pick rooms, then print A4 sheets of cut-out labels
// (picture, Spanish, pronunciation, English) to stick on things around the house.
import { useState } from "react";
import { LABEL_ROOMS } from "../content/labels.ts";
import { voice } from "../audio/player.ts";
import { Button } from "../components/ui.tsx";
import { Art } from "../components/Art.tsx";

type Size = "big" | "small";

export function LabelsScreen({ onBack }: { onBack: () => void }) {
  const [rooms, setRooms] = useState<string[]>(LABEL_ROOMS.map(r => r.id));
  const [english, setEnglish] = useState(true);
  const [say, setSay] = useState(true);
  const [size, setSize] = useState<Size>("big");
  const chosen = LABEL_ROOMS.filter(r => rooms.includes(r.id));
  const count = chosen.reduce((n, r) => n + r.labels.length, 0);
  const perPage = size === "big" ? 8 : 15;
  const toggle = (id: string) => setRooms(rs => (rs.includes(id) ? rs.filter(x => x !== id) : [...rs, id]));

  return <div className="app-bg labels-page">
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="no-print">
        <Button size="sm" variant="ghost" onClick={onBack} style={{ marginBottom: 8 }}>← Grown-up dashboard</Button>
        <h1 className="h1">Labels for home <span lang="es">🏷️</span></h1>
        <p className="muted" style={{ margin: "6px 0 16px", maxWidth: 640 }}>
          Print these, cut them out and stick them on the real things: the fridge, the door, the toothbrush. Seeing <span lang="es">la nevera</span> every
          time you get the milk is one of the easiest ways for the whole family to pick up words. Tap any label here to hear it.
        </p>
        <div className="labels-controls card">
          <div className="labels-controls__group" role="group" aria-label="Rooms">
            {LABEL_ROOMS.map(r => <button key={r.id} type="button" className={`chip-toggle ${rooms.includes(r.id) ? "is-on" : ""}`} aria-pressed={rooms.includes(r.id)} onClick={() => toggle(r.id)}>
              <Art e={r.emoji} size={22} still /> {r.en}
            </button>)}
          </div>
          <div className="labels-controls__group">
            <label className="check"><input type="checkbox" checked={english} onChange={e => setEnglish(e.target.checked)} /> English</label>
            <label className="check"><input type="checkbox" checked={say} onChange={e => setSay(e.target.checked)} /> How to say it</label>
            <label className="check"><input type="radio" name="size" checked={size === "big"} onChange={() => setSize("big")} /> Big (8 a page)</label>
            <label className="check"><input type="radio" name="size" checked={size === "small"} onChange={() => setSize("small")} /> Small (15 a page)</label>
          </div>
          <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="sun" disabled={!count} onClick={() => window.print()}>🖨️ Print {count} labels</Button>
            <span className="small muted">About {Math.max(1, Math.ceil(count / perPage))} A4 {Math.ceil(count / perPage) === 1 ? "page" : "pages"}. Tip: thick paper or sticky label paper works best.</span>
          </div>
        </div>
      </div>

      <div className={`label-sheet label-sheet--${size}`}>
        {chosen.map(r => <section key={r.id} className="label-room">
          <h2 className="label-room__title"><span lang="es">{r.es}</span> · {r.en}</h2>
          <div className="label-grid">
            {r.labels.map(x => <button key={x.es} type="button" className="home-label" onClick={() => voice.spanish(x.es)} aria-label={`${x.es}: ${x.en}. Tap to hear it.`}>
              <Art e={x.emoji} size={size === "big" ? 64 : 40} eager still />
              <span className="home-label__es" lang="es">{x.es}</span>
              {say && <span className="home-label__say">{x.say}</span>}
              {english && <span className="home-label__en">{x.en}</span>}
            </button>)}
          </div>
        </section>)}
      </div>
    </div>
  </div>;
}
