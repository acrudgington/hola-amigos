import { useEffect, useState, type FormEvent } from "react";
import { countLessons, liveStreak, sumStars } from "../domain/progress.ts";
import { services, type Child, type Parent } from "../services/index.ts";
import { useFamily } from "../state/useFamily.ts";
import { dismissDeviceLearners, findDeviceLearners, importDeviceLearners } from "../services/deviceImport.ts";
import type { Prefs } from "../lib/prefs.ts";
import { motion } from "framer-motion";
import { Button, Card, Field, Modal } from "../components/ui.tsx";
import { PrefToggles } from "../components/Shell.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { Art } from "../components/Art.tsx";

export const AVATARS = ["🦊", "🐼", "🦄", "🐯", "🐶", "🐱", "🐰", "🐸", "🦁", "🐻", "🐨", "🐵", "🦉", "🐢", "🐙", "🦋"];

function AddChildModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, avatar: string) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
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
        {AVATARS.map(a => <button key={a} type="button" className="avatar-pick" aria-pressed={avatar === a} onClick={() => setAvatar(a)} aria-label={`Animal ${a}`}><Art e={a} size={40} /></button>)}
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="row" style={{ gap: 10 }}>
        <Button block onClick={onClose}>Cancel</Button>
        <Button block type="submit" variant="sun">Add ✓</Button>
      </div>
    </form>
  </Modal>;
}

export function FamilyScreen({ parent, onPickChild, onDashboard, onLogout, prefs, onToggle }: { parent: Parent; onPickChild: (c: Child) => void; onDashboard: () => void; onLogout: () => void; prefs?: Prefs; onToggle?: (key: keyof Prefs) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const { family, reload } = useFamily(parent.id);
  const add = async (name: string, avatar: string) => { await services.family.addChild(parent.id, name, avatar); setShowAdd(false); await reload(); };
  const children = family ?? [];
  // Learners saved on this device before cloud accounts: offer to bring them in.
  const [deviceKids, setDeviceKids] = useState<Child[]>([]);
  const [importing, setImporting] = useState(false);
  useEffect(() => { void findDeviceLearners(parent.email).then(setDeviceKids); }, [parent.email]);
  const doImport = async () => {
    setImporting(true);
    await importDeviceLearners(parent.email, parent.id);
    setDeviceKids([]); setImporting(false);
    await reload();
  };

  return <div className="app-bg">
    <div className="page">
      <div className="text-center" style={{ margin: "14px 0 26px" }}>
        <div className="row row--center" style={{ gap: 4, marginBottom: 8 }}>
          <div className="float"><Sol size={66} /></div><div className="float float--delay"><Luna size={62} mood="happy" /></div>
        </div>
        <h1 className="h1">Who’s learning <span className="gradient-text">today?</span></h1>
        <p className="muted" style={{ marginTop: 6 }}>Hi {parent.name}! Tap a learner to start.</p>
      </div>

      {deviceKids.length > 0 && <div className="notice notice--warn" style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 8 }}>We found {deviceKids.map(k => `${k.avatar} ${k.name}`).join(", ")} saved on this device. Bring their progress into your account so it’s safe and syncs everywhere?</div>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="sun" disabled={importing} onClick={() => void doImport()}>{importing ? "Bringing them in…" : "Yes, bring them in"}</Button>
          <Button size="sm" variant="ghost" onClick={() => { dismissDeviceLearners(parent.email); setDeviceKids([]); }}>Not now</Button>
        </div>
      </div>}
      <div className="grid-2" style={{ gap: 14, marginBottom: 22 }}>
        {children.map(({ child: c, progress: p }, i) => {
          const streak = liveStreak(p);
          return <motion.div key={c.id} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 20 }}>
          <Card as="button" type="button" pad={false} className="profile-tile" onClick={() => onPickChild(c)}>
            <div className="profile-tile__avatar"><Art e={c.avatar} size={64} eager /></div>
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
        {prefs && onToggle && <PrefToggles prefs={prefs} onToggle={onToggle} />}
      </div>
    </div>
    {showAdd && <AddChildModal onClose={() => setShowAdd(false)} onAdd={add} />}
  </div>;
}
