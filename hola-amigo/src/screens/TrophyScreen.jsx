import { useState } from "react";
import { BADGES, OUTFITS, RARITY, STICKERS } from "../data/rewards.js";
import { darken } from "../lib/utils.js";
import { Button, Card } from "../components/ui.jsx";
import { Luna, Sol } from "../components/Mascots.jsx";

const TABS = [["badges", "🏆 Badges"], ["stickers", "✨ Stickers"], ["outfits", "🎩 Dress up"]];

export function TrophyScreen({ progress, onBack, onEquip }) {
  const [tab, setTab] = useState("badges");
  const badges = new Set(progress.badges || []);
  const stickers = new Set(progress.stickers || []);
  const outfits = new Set([...(progress.outfits || []), "none"]);
  const current = { sol: progress.solOutfit || "none", luna: progress.lunaOutfit || "none" };
  const sortedBadges = [...BADGES].sort((a, b) => badges.has(b.id) - badges.has(a.id));

  return <div className="app-bg">
    <div className="page">
      <Button size="sm" onClick={onBack} style={{ marginBottom: 10 }}>← Map</Button>
      <div className="text-center" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 50 }} className="float">🏆</div>
        <h1 className="h2">Trophy shelf</h1>
      </div>
      <div className="segmented" role="tablist" style={{ marginBottom: 18, background: "#fff" }}>
        {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === "badges" && <>
        <p className="small muted text-center" style={{ marginBottom: 14 }}>{badges.size} of {BADGES.length} badges earned</p>
        <div className="grid-2">
          {sortedBadges.map((b, i) => {
            const has = badges.has(b.id);
            return <Card key={b.id} pad={false} className={`trophy ${has ? "" : "trophy--locked"}`} style={{ animationDelay: `${Math.min(i, 12) * 0.03}s`, ...(has ? { borderColor: "#ffd98a", boxShadow: "0 4px 0 #ffc65a" } : {}) }}>
              <div className="trophy__emoji">{b.emoji}</div>
              <div className="trophy__name">{has ? b.name : `🔒 ${b.name}`}</div>
              <div className="trophy__desc">{b.desc}</div>
            </Card>;
          })}
        </div>
      </>}

      {tab === "stickers" && <>
        <p className="small muted text-center" style={{ marginBottom: 14 }}>{stickers.size} of {STICKERS.length} stickers collected</p>
        <div className="grid-3">
          {STICKERS.map((s, i) => {
            const has = stickers.has(s.id);
            const rc = RARITY[s.rarity]?.c;
            return <div key={s.id} className={`sticker ${has ? "" : "sticker--locked"}`} title={has ? s.desc : `Locked: ${s.desc}`}
              style={{ "--rc": rc, "--rc-d": darken(rc), animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
              <div style={{ fontSize: 36 }}>{has ? s.emoji : "❓"}</div>
              <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.15, marginTop: 4 }}>{has ? s.name : "???"}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, marginTop: 2, lineHeight: 1.2 }}>{has ? (s.rarity !== "common" ? <span style={{ color: rc, fontWeight: 900, textTransform: "uppercase" }}>{s.rarity}</span> : "") : s.desc}</div>
            </div>;
          })}
        </div>
      </>}

      {tab === "outfits" && <>
        <Card className="row row--center" style={{ gap: 30, marginBottom: 18 }}>
          <div className="text-center"><div className="float"><Sol size={92} outfit={current.sol} /></div><div className="h3">Sol</div></div>
          <div className="text-center"><div className="float float--delay"><Luna size={92} mood="happy" outfit={current.luna} /></div><div className="h3">Luna</div></div>
        </Card>
        {["sol", "luna"].map(who => <div key={who} style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8, color: who === "sol" ? "var(--sun-d)" : "var(--luna)" }}>{who === "sol" ? "☀️ Sol’s outfit" : "🌙 Luna’s outfit"}</div>
          <div className="grid-4">
            {OUTFITS.map(o => {
              const has = outfits.has(o.id);
              const on = current[who] === o.id;
              return <button key={o.id} type="button" className="avatar-pick" aria-pressed={on} disabled={!has} onClick={() => onEquip(who, o.id)}
                title={has ? o.name : `Locked: ${o.desc}`} style={{ opacity: has ? 1 : 0.45, cursor: has ? "pointer" : "not-allowed", padding: "8px 2px" }}>
                <div style={{ fontSize: 24 }}>{has ? o.emoji : "🔒"}</div>
                <div style={{ fontSize: 10, fontWeight: 900, marginTop: 2 }}>{o.name}</div>
              </button>;
            })}
          </div>
        </div>)}
        {OUTFITS.some(o => !outfits.has(o.id)) && <div className="card card--sun card--pad small">
          <div style={{ fontWeight: 900, color: "var(--sun-d)", marginBottom: 4 }}>🔒 How to unlock</div>
          {OUTFITS.filter(o => !outfits.has(o.id)).map(o => <div key={o.id} style={{ fontWeight: 700 }}>{o.emoji} {o.name} — {o.desc}</div>)}
        </div>}
      </>}
    </div>
  </div>;
}
