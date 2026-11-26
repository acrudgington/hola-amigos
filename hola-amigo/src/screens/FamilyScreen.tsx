import { useEffect, useState, type FormEvent } from "react";
import { countLessons, liveStreak, sumStars } from "../domain/progress.ts";
import { services, type Child, type Parent } from "../services/index.ts";
import { roomFor, type LearnerKind } from "../services/types.ts";
import { FAMILY } from "../config.ts";
import { packById } from "../content/index.ts";
import { packProgress } from "../domain/packs.ts";
import { useFamily } from "../state/useFamily.ts";
import { dismissDeviceLearners, findDeviceLearners, importDeviceLearners } from "../services/deviceImport.ts";
import type { Prefs } from "../lib/prefs.ts";
import { motion } from "framer-motion";
import { Button, Card, Field, Modal } from "../components/ui.tsx";
import { PrefToggles } from "../components/Shell.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { randomAvatar } from "../domain/avatar.ts";
import { AvatarMaker } from "../components/AvatarMaker.tsx";
import { Avatar } from "../components/Avatar.tsx";


function AddChildModal({ kind, onClose, onAdd }: { kind: LearnerKind; onClose: () => void; onAdd: (name: string, avatar: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(randomAvatar);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Please type a name!");
    onAdd(name.trim(), avatar).catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong. Please try again."));
  };
  return <Modal onClose={onClose} labelledBy="add-child-title">
    <form onSubmit={submit}>
      <h3 id="add-child-title" className="h2 text-center" style={{ marginBottom: 4 }}>{kind === "adult" ? "Add a grown-up learner" : "Add a child"}</h3>
      <p className="small muted text-center" style={{ marginBottom: 12 }}>{kind === "adult" ? "Grown-ups get “Español para padres”: Spanish for school, the doctor, neighbours and more." : "Each child gets their own map, stars and stickers."}</p>
      <Field label={kind === "adult" ? "Your name" : "Child’s name"} placeholder={kind === "adult" ? "e.g. Emma" : "e.g. Mia"} value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={20} />
      <span className="field__label">Make your avatar</span>
      <div style={{ marginBottom: 18 }}><AvatarMaker value={avatar} onChange={setAvatar} /></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="row" style={{ gap: 10 }}>
        <Button block onClick={onClose}>Cancel</Button>
        <Button block type="submit" variant="sun">Add ✓</Button>
      </div>
    </form>
  </Modal>;
}

export function FamilyScreen({ parent, onPickChild, onDashboard, onLogout, prefs, onToggle }: { parent: Parent; onPickChild: (c: Child) => void; onDashboard: () => void; onLogout: () => void; prefs?: Prefs; onToggle?: (key: keyof Prefs) => void }) {
  const [showAdd, setShowAdd] = useState<LearnerKind | null>(null);
  const { family, reload } = useFamily(parent.id);
  const add = async (name: string, avatar: string) => { if (!showAdd) return; await services.family.addChild(parent.id, name, avatar, showAdd); setShowAdd(null); await reload(); };
  const everyone = family ?? [];
  const children = everyone.filter(x => x.child.kind !== "adult");
  const adults = everyone.filter(x => x.child.kind === "adult");
  const learners = everyone.map(x => x.child);
  const parentsPack = packById("parents");
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
        <div style={{ marginBottom: 8 }}>We found {deviceKids.map(k => k.name).join(", ")} saved on this device. Bring their progress into your account so it’s safe and syncs everywhere?</div>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="sun" disabled={importing} onClick={() => void doImport()}>{importing ? "Bringing them in…" : "Yes, bring them in"}</Button>
          <Button size="sm" variant="ghost" onClick={() => { dismissDeviceLearners(parent.email); setDeviceKids([]); }}>Not now</Button>
        </div>
      </div>}
      <h2 className="eyebrow" style={{ marginBottom: 8 }}>Children · {children.length} of {FAMILY.maxChildren}</h2>
      <div className="grid-2" style={{ gap: 14, marginBottom: 22 }}>
        {children.map(({ child: c, progress: p }, i) => {
          const streak = liveStreak(p);
          return <motion.div key={c.id} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 20 }}>
          <Card as="button" type="button" pad={false} className="profile-tile" onClick={() => onPickChild(c)}>
            <Avatar value={c.avatar} size={84} style={{ marginBottom: 8 }} />
            <div className="h3">{c.name}</div>
            <div className="small muted">⭐ {sumStars(p)} · {countLessons(p)} lessons</div>
            {streak > 0 && <div className="small" style={{ color: "var(--fire)", fontWeight: 900 }}>🔥 {streak}-day streak</div>}
          </Card></motion.div>;
        })}
        {roomFor(learners, "child") > 0 && <button type="button" className="card profile-tile profile-tile--add" onClick={() => setShowAdd("child")}>
          <div className="profile-tile__avatar" style={{ borderStyle: "dashed", fontSize: 40, color: "var(--sun)" }}>＋</div>
          <div className="h3">Add a child</div>
          <div className="small muted">Each child gets their own map</div>
        </button>}
      </div>

      <h2 className="eyebrow" style={{ marginBottom: 8 }}>Grown-ups · {adults.length} of {FAMILY.maxAdults}</h2>
      <div className="grid-2" style={{ gap: 14, marginBottom: 22 }}>
        {adults.map(({ child: c, progress: p }) => {
          const pr = parentsPack ? packProgress(p, parentsPack) : null;
          return <Card key={c.id} as="button" type="button" pad={false} className="profile-tile profile-tile--adult" onClick={() => onPickChild(c)}>
            <Avatar value={c.avatar} size={84} style={{ marginBottom: 8 }} />
            <div className="h3">{c.name}</div>
            <div className="small muted">{pr ? `☕ ${pr.done} of ${pr.total} parent lessons` : "Grown-up learner"}</div>
          </Card>;
        })}
        {roomFor(learners, "adult") > 0 && <button type="button" className="card profile-tile profile-tile--add profile-tile--adult" onClick={() => setShowAdd("adult")}>
          <div className="profile-tile__avatar" style={{ borderStyle: "dashed", fontSize: 40, color: "var(--luna, #a99cff)" }}>＋</div>
          <div className="h3">Add a grown-up</div>
          <div className="small muted">Spanish for parents</div>
        </button>}
      </div>

      <div className="stack">
        <Button variant="luna" block onClick={onDashboard}>📊 Grown-up dashboard &amp; settings</Button>
        <Button block onClick={onLogout}>Log out</Button>
        {prefs && onToggle && <PrefToggles prefs={prefs} onToggle={onToggle} />}
      </div>
    </div>
    {showAdd && <AddChildModal kind={showAdd} onClose={() => setShowAdd(null)} onAdd={add} />}
  </div>;
}
