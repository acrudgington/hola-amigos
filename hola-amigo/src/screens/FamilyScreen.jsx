import { useState } from "react";
import { db, liveStreak } from "../lib/db.js";
import { countLessons, sumStars } from "../lib/utils.js";
import { motion } from "framer-motion";
import { Button, Card, Field, Modal } from "../components/ui.jsx";
import { PrefToggles } from "../components/Shell.jsx";
import { Luna, Sol } from "../components/Mascots.jsx";

export const AVATARS = ["🦊", "🐼", "🦄", "🐯", "🐶", "🐱", "🐰", "🐸", "🦁", "🐻", "🐨", "🐵", "🦉", "🐢", "🐙", "🦋"];

function AddChildModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");
  const submit = e => {
    e.preventDefault();
    if (!name.trim()) return setError("Please type a name!");
    onAdd(name.trim(), avatar);
  };
  return <Modal onClose={onClose} labelledBy="add-child-title">
    <form onSubmit={submit}>
      <div className="text-center" style={{ fontSize: 56, marginBottom: 4 }}>{avatar}</div>
      <h3 id="add-child-title" className="h2 text-center" style={{ marginBottom: 16 }}>Add a learner</h3>
      <Field label="Child’s name" placeholder="e.g. Mia" value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={20} />
      <span className="field__label">Pick an animal friend</span>
      <div className="grid-4" style={{ marginBottom: 18 }}>
        {AVATARS.map(a => <button key={a} type="button" className="avatar-pick" aria-pressed={avatar === a} onClick={() => setAvatar(a)}>{a}</button>)}
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="row" style={{ gap: 10 }}>
        <Button block onClick={onClose}>Cancel</Button>
        <Button block type="submit" variant="sun">Add ✓</Button>
      </div>
    </form>
  </Modal>;
}

export function FamilyScreen({ parent, onPickChild, onDashboard, onLogout, prefs, onToggle }) {
  const [showAdd, setShowAdd] = useState(false);
  const [, force] = useState(0);
  const children = db.getChildrenOf(parent.email);
  const add = (name, avatar) => { db.createChild(parent.email, name, avatar); setShowAdd(false); force(x => x + 1); };

  return <div className="app-bg">
    <div className="page">
      <div className="text-center" style={{ margin: "14px 0 26px" }}>
        <div className="row row--center" style={{ gap: 4, marginBottom: 8 }}>
          <div className="float"><Sol size={66} /></div><div className="float float--delay"><Luna size={62} mood="happy" /></div>
        </div>
        <h1 className="h1">Who’s learning <span className="gradient-text">today?</span></h1>
        <p className="muted" style={{ marginTop: 6 }}>Hi {parent.name}! Tap a learner to start.</p>
      </div>

      <div className="grid-2" style={{ gap: 14, marginBottom: 22 }}>
        {children.map((c, i) => {
          const p = db.getProgress(c.id);
          const streak = liveStreak(p);
          return <motion.div key={c.id} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 20 }}>
          <Card as="button" type="button" pad={false} className="profile-tile" onClick={() => onPickChild(c)}>
            <div className="profile-tile__avatar">{c.avatar}</div>
            <div className="h3">{c.name}</div>
            <div className="small muted">⭐ {sumStars(p)} · {countLessons(p)} lessons</div>
            {streak > 0 && <div className="small" style={{ color: "var(--fire)", fontWeight: 900 }}>🔥 {streak}-day streak</div>}
          </Card></motion.div>;
        })}
        <button type="button" className="card profile-tile profile-tile--add" onClick={() => setShowAdd(true)}>
          <div className="profile-tile__avatar" style={{ borderStyle: "dashed", fontSize: 40, color: "var(--sun)" }}>＋</div>
          <div className="h3">Add learner</div>
          <div className="small muted">Each child gets their own map</div>
        </button>
      </div>

      <div className="stack">
        {children.length > 0 && <Button variant="luna" block onClick={onDashboard}>📊 Grown-up dashboard</Button>}
        <Button block onClick={onLogout}>Log out</Button>
        {prefs && <PrefToggles prefs={prefs} onToggle={onToggle} />}
      </div>
    </div>
    {showAdd && <AddChildModal onClose={() => setShowAdd(false)} onAdd={add} />}
  </div>;
}
