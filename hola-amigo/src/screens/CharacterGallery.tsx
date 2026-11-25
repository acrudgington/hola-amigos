// Sol & Luna's expressions in one place, for checking the animation work.
// Open the app with #characters on the end of the address. Not linked for children.
import { useState } from "react";
import { voice } from "../audio/player.ts";
import { Cosmos } from "../components/Cosmos.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { REACTION_LINES, type Mood } from "../lib/reactions.ts";

const MOODS: Mood[] = ["happy", "celebrate", "encourage", "wink", "thinking", "surprised", "sleepy"];

export function CharacterGallery() {
  const [mood, setMood] = useState<Mood>("happy");
  const say = (who: "sol" | "luna") => {
    const lines = REACTION_LINES.filter(l => l.who === who);
    voice.unlock();
    voice.narrate(lines[Math.floor(Math.random() * lines.length)].text, { speaker: who });
  };
  return <div className="app">
    <Cosmos />
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="eyebrow">Character lab</div>
      <h1 className="h1" style={{ margin: "4px 0 16px" }}>Sol & Luna</h1>
      <div className="card card--pad" style={{ marginBottom: 16 }}>
        <div className="row row--center" style={{ gap: 40, padding: "10px 0 6px" }}>
          <Sol size={180} mood={mood} /><Luna size={170} mood={mood} />
        </div>
        <div className="row row--center row--wrap" style={{ gap: 8, marginTop: 14 }}>
          {MOODS.map(m => <button key={m} type="button" className={`btn btn--sm ${m === mood ? "btn--sun" : "btn--white"}`} onClick={() => setMood(m)}>{m}</button>)}
        </div>
        <div className="row row--center" style={{ gap: 8, marginTop: 10 }}>
          <button type="button" className="btn btn--sm btn--luna" onClick={() => say("sol")}>Sol talks</button>
          <button type="button" className="btn btn--sm btn--luna" onClick={() => say("luna")}>Luna talks</button>
        </div>
        <p className="small muted text-center" style={{ marginTop: 10 }}>Tap a character to make them giggle. Move your finger or mouse: they watch it.</p>
      </div>
      <div className="grid-4">
        {MOODS.map(m => <div key={m} className="card card--pad text-center">
          <div className="row row--center" style={{ gap: 4 }}><Sol size={72} mood={m} /><Luna size={68} mood={m} /></div>
          <div className="eyebrow" style={{ marginTop: 6 }}>{m}</div>
        </div>)}
      </div>
    </div>
  </div>;
}
