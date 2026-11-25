// Make your own avatar: pick a character (children come in five skin tones),
// a background colour and something fun to wear.
import { useState } from "react";
import { ACCESSORIES, BACKGROUNDS, CHARACTERS, decodeAvatar, encodeAvatar, type AvatarSpec } from "../domain/avatar.ts";
import { Avatar } from "./Avatar.tsx";
import { Art } from "./Art.tsx";
import { Segmented } from "./ui.tsx";

const TONE_SWATCHES = ["#FFCC4D", "#F7DECE", "#F3D2A2", "#D5AB88", "#AF7E57", "#7C533E"];
type Tab = "who" | "colour" | "extras";

export function AvatarMaker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const start = decodeAvatar(value);
  const [a, setA] = useState<AvatarSpec>({ char: start.char, tone: start.tone, bg: start.bg, acc: start.acc });
  const [tab, setTab] = useState<Tab>("who");
  const set = (patch: Partial<AvatarSpec>) => { const next = { ...a, ...patch }; setA(next); onChange(encodeAvatar(next)); };
  const char = CHARACTERS[a.char];
  const code = encodeAvatar(a);

  return <div className="maker">
    <div className="maker__preview"><Avatar value={code} size={120} /></div>
    <Segmented id="maker" options={[["who", "Character"], ["colour", "Colour"], ["extras", "Extras"]]} value={tab} onChange={k => setTab(k as Tab)} />
    {tab === "who" && <>
      {char.tones.length > 1 && <div className="maker__tones" role="radiogroup" aria-label="Skin tone">
        {char.tones.map((_, i) => <button key={i} type="button" role="radio" aria-checked={a.tone === i} aria-label={i ? `Skin tone ${i}` : "Default"}
          className="tone" style={{ background: TONE_SWATCHES[i] }} onClick={() => set({ tone: i })} />)}
      </div>}
      <div className="maker__grid">
        {CHARACTERS.map((c, i) => <button key={c.id} type="button" className="maker__opt" aria-pressed={a.char === i} aria-label={c.label}
          onClick={() => set({ char: i, tone: c.tones.length > 1 ? Math.min(a.tone, c.tones.length - 1) : 0 })}>
          <Art e={c.tones[c.tones.length > 1 ? a.tone : 0] ?? c.tones[0]} size={40} still />
        </button>)}
      </div>
    </>}
    {tab === "colour" && <div className="maker__grid maker__grid--colours">
      {BACKGROUNDS.map(([c1, c2], i) => <button key={i} type="button" className="maker__swatch" aria-pressed={a.bg === i} aria-label={`Colour ${i + 1}`}
        style={{ background: `radial-gradient(circle at 32% 26%, ${c1}, ${c2})` }} onClick={() => set({ bg: i })} />)}
    </div>}
    {tab === "extras" && <div className="maker__grid">
      {ACCESSORIES.map((x, i) => <button key={x.id} type="button" className="maker__opt" aria-pressed={a.acc === i} aria-label={x.label} onClick={() => set({ acc: i })}>
        {x.emoji ? <Art e={x.emoji} size={36} still /> : <span className="small muted" style={{ fontWeight: 800 }}>None</span>}
      </button>)}
    </div>}
  </div>;
}
