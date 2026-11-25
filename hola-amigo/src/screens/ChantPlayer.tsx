// "Chant along": Sol and Luna take turns saying a rhyme in Spanish, in their own
// voices, over a soft beat, while each line lights up. In "Your turn" mode they
// pause after each line so the child can say it back.
import { useEffect, useRef, useState } from "react";
import { voice } from "../audio/player.ts";
import { WORLDS, type Chant } from "../content/index.ts";
import { sfx } from "../lib/sound.ts";
import { Button, Card } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";

const keepDashes = (t: string) => t.replace(/—(?=\S)/g, "—⁠");

export function ChantPlayer({ chant, onClose, onFinish }: { chant: Chant; onClose: () => void; onFinish: () => void }) {
  const [active, setActive] = useState(-1);
  const [yourTurn, setYourTurn] = useState(false);       // the mode
  const [repeating, setRepeating] = useState(false);     // "now you!" pause in progress
  const [playing, setPlaying] = useState(false);
  const [english, setEnglish] = useState(false);
  const [beat, setBeat] = useState(0);
  const [done, setDone] = useState(false);
  const run = useRef(0);
  const finished = useRef(false);
  const world = WORLDS.find(w => w.id === chant.world)!;
  const beatMs = 60000 / chant.bpm;

  // The beat runs while chanting.
  useEffect(() => {
    if (!playing) return;
    let n = 0;
    sfx.beat(n);
    const id = setInterval(() => { n += 1; sfx.beat(n); setBeat(n); }, beatMs);
    return () => clearInterval(id);
  }, [playing, beatMs]);
  useEffect(() => () => { run.current++; voice.stop(); }, []);

  const stop = () => { run.current++; voice.stop(); setPlaying(false); setRepeating(false); setActive(-1); };
  const play = () => {
    if (playing) { stop(); return; }
    const id = ++run.current;
    setPlaying(true); setDone(false);
    const line = (i: number) => {
      if (id !== run.current) return;
      if (i >= chant.lines.length) {
        setPlaying(false); setActive(-1); setDone(true);
        if (!finished.current) { finished.current = true; onFinish(); }
        return;
      }
      const l = chant.lines[i];
      setActive(i); setRepeating(false);
      let moved = false;
      const next = () => {
        if (moved || id !== run.current) return;
        moved = true;
        if (yourTurn) {
          // Pause long enough to say the line back, then carry on.
          setRepeating(true);
          setTimeout(() => line(i + 1), Math.max(2200, l.es.length * 95) + beatMs);
        } else setTimeout(() => line(i + 1), beatMs * 0.75);
      };
      voice.spanishBy(l.who, l.es, { onEnd: next });
      setTimeout(next, 4500 + l.es.length * 110);   // in case a device voice never reports finishing
    };
    setTimeout(() => line(0), beatMs * 2);           // two beats to count in
  };

  const speaker = active >= 0 ? chant.lines[active].who : null;
  const moodFor = (who: "sol" | "luna") => (done ? "celebrate" : repeating ? "encourage" : speaker === who ? "happy" : "wink");
  const bounce = playing && !repeating ? (beat % 2 === 0 ? "is-beat" : "") : "";

  return <div style={{ paddingTop: 4, maxWidth: 680, margin: "0 auto" }}>
    <Button size="sm" variant="ghost" onClick={() => { stop(); onClose(); }} style={{ marginBottom: 8 }}><Icon name="chevronLeft" size={16} />Shelf</Button>
    <Card className="card--pad-lg chant" style={{ "--wc": world.color }}>
      <div className="reader__head">
        <Art e={chant.emoji} size={52} />
        <div className="grow">
          <div className="eyebrow">Chant along · {world.name}</div>
          <h1 className="h2" lang="es">{chant.title}</h1>
          {english && <div className="small muted">{chant.en}</div>}
        </div>
      </div>

      <div className={`chant__stage ${bounce}`}>
        <div className={`chant__who ${speaker === "sol" ? "is-on" : ""}`}><Sol size={92} mood={moodFor("sol")} /></div>
        <div className="chant__beat" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} className={playing && beat % 4 === i ? "on" : ""} />)}</div>
        <div className={`chant__who ${speaker === "luna" ? "is-on" : ""}`}><Luna size={88} mood={moodFor("luna")} /></div>
      </div>
      {repeating && <div className="chant__turn" role="status">🎤 Your turn! Say it back!</div>}

      <div className="chant__lines" lang="es">
        {chant.lines.map((l, i) => <p key={i} className={`chant__line chant__line--${l.who} ${active === i ? "is-active" : ""} ${active > i ? "is-said" : ""}`}
          onClick={() => { if (!playing) voice.spanishBy(l.who, l.es); }}>
          <span>{keepDashes(l.es)}</span>
          {english && <span className="reader__en" lang="en">{l.en}</span>}
        </p>)}
      </div>

      <div className="row row--center row--wrap" style={{ gap: 10, marginTop: 16 }}>
        <Button variant={playing ? "coral" : "sun"} size="lg" onClick={play}>{playing ? "⏹ Stop" : done ? "↻ ¡Otra vez!" : "▶ Chant"}</Button>
        <Button variant={yourTurn ? "luna" : "white"} onClick={() => setYourTurn(t => !t)} aria-pressed={yourTurn} disabled={playing}>🎤 Your turn {yourTurn ? "on" : "off"}</Button>
        <Button variant="white" onClick={() => setEnglish(e => !e)} aria-pressed={english}>{english ? "Hide English" : "Show English"}</Button>
      </div>
      <p className="tiny muted text-center" style={{ marginTop: 10 }}>💡 Turn on “Your turn” to repeat each line after Sol and Luna. Tap a line to hear it again.</p>
    </Card>
  </div>;
}
