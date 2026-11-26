// "Account & privacy" for the grown-up: consent record, password reset,
// download all data, and permanent account deletion.
import { useState } from "react";
import { services, type Parent } from "../services/index.ts";
import { Button, Card, Field, Modal } from "./ui.tsx";
import { Icon } from "./Icon.tsx";
import { PrivacyNotice } from "./PrivacyNotice.tsx";
import { Art } from "./Art.tsx";

export function AccountPanel({ parent, onDeleted }: { parent: Parent; onDeleted: () => void }) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const cloud = services.kind === "cloud";

  const download = async () => {
    setBusy(true);
    try {
      const data = await services.family.exportData(parent.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hola-amigo-family-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setNotice("Your family’s data has been downloaded.");
    } catch {
      setError("Couldn’t download right now. Please try again.");
    } finally { setBusy(false); }
  };

  const reset = async () => {
    const res = await services.auth.resetPassword(parent.email);
    if (res.ok) setNotice(`We’ve emailed a password reset link to ${parent.email}.`); else setError(res.error);
  };

  const remove = async () => {
    setBusy(true); setError("");
    const res = await services.auth.deleteAccount(password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setConfirmDelete(false);
    onDeleted();
  };

  const agreed = parent.consent ? new Date(parent.consent.acceptedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;

  return <Card style={{ marginTop: 8 }} id="account">
    <div className="widget__head"><div className="widget__title" style={{ fontSize: 16 }}><Icon name="lock" size={18} />Account & privacy</div></div>
    <p className="small" style={{ fontWeight: 700, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 14 }}>
      Signed in as <b>{parent.email}</b>. {cloud ? "Progress syncs across your family’s devices." : "Everything is saved on this device only."}
      {agreed && <> You agreed to the privacy notice on {agreed}.</>}
    </p>
    {notice && <div className="notice notice--good" role="status">{notice}</div>}
    {error && !confirmDelete && <div className="form-error" role="alert">{error}</div>}
    <div className="stack" style={{ "--gap": "10px" }}>
      <Button block onClick={() => void download()} disabled={busy}><Icon name="book" size={18} />Download my family’s data</Button>
      {cloud && <Button block onClick={() => void reset()}><Icon name="lock" size={18} />Email me a password reset link</Button>}
      <Button block onClick={() => setShowPrivacy(true)}><Icon name="chat" size={18} />Privacy notice & terms</Button>
      <Button block variant="ghost" onClick={() => { setConfirmDelete(true); setError(""); setPassword(""); }} style={{ color: "var(--coral)" }}>Delete my account…</Button>
    </div>
    {showPrivacy && <PrivacyNotice onClose={() => setShowPrivacy(false)} />}
    {confirmDelete && <Modal onClose={() => setConfirmDelete(false)} labelledBy="del-title">
      <div className="text-center"><Art e="⚠️" size={56} /></div>
      <h3 id="del-title" className="h2 text-center" style={{ margin: "4px 0 8px" }}>Delete your account?</h3>
      <p className="muted small text-center" style={{ marginBottom: 16 }}>This permanently deletes your login and every child’s progress, stars and rewards. It can’t be undone. You might like to download your data first.</p>
      <Field label="Type your password to confirm" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="row" style={{ gap: 10 }}>
        <Button block onClick={() => setConfirmDelete(false)}>Keep my account</Button>
        <Button block variant="coral" disabled={!password || busy} onClick={() => void remove()}>Delete forever</Button>
      </div>
    </Modal>}
  </Card>;
}
