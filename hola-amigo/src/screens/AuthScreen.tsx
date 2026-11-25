import { useState, type FormEvent } from "react";
import { ALL_WORDS, LESSONS } from "../content/index.ts";
import { services, type Parent } from "../services/index.ts";
import { PRIVACY } from "../config.ts";
import { motion } from "framer-motion";
import { Button, Field, Segmented } from "../components/ui.tsx";
import { PrivacyNotice } from "../components/PrivacyNotice.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";

type Mode = "login" | "signup" | "reset";
export function AuthScreen({ onLogin }: { onLogin: (p: Parent) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [notice, setNotice] = useState("");

  const switchMode = (m: Mode) => { setMode(m); setError(""); setNotice(""); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    const em = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setError(em ? "That email doesn’t look quite right." : "Please type your email.");
    if (mode === "reset") {
      setBusy(true);
      const res = await services.auth.resetPassword(em);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      return setNotice("If there’s an account for that email, we’ve sent a link to reset the password. Check your inbox (and spam).");
    }
    if (!pass || (mode === "signup" && !name.trim())) return setError("Please fill in all the boxes!");
    if (mode === "signup" && !consent) return setError("Please tick the box to confirm you’re the parent or guardian.");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (pass.length < 6) return setError("Password needs at least 6 characters.");
        const res = await services.auth.signUp(name.trim(), em, pass, { version: PRIVACY.version, acceptedAt: Date.now() });
        if (!res.ok) return setError(res.error);
        onLogin(res.parent);
      } else {
        const res = await services.auth.logIn(em, pass);
        if (!res.ok) return setError(res.error);
        onLogin(res.parent);
      }
    } finally {
      setBusy(false);
    }
  };

  return <div className="app-bg">
    <div className="center-screen">
      <div style={{ width: "100%", maxWidth: 410 }}>
        <div className="text-center" style={{ marginBottom: 22 }}>
          <div className="row row--center" style={{ gap: 6, marginBottom: 10 }}>
            <div className="float"><Sol size={84} mood="celebrate" /></div>
            <div className="float float--delay"><Luna size={78} mood="happy" /></div>
          </div>
          <h1 className="h1" style={{ fontSize: 46 }}>¡Hola, <span className="gradient-text">Amigo!</span></h1>
          <p className="muted" style={{ marginTop: 6 }}>Spanish adventures for curious kids · {LESSONS.length} lessons · {ALL_WORDS.length} words</p>
        </div>

        <motion.form className="card card--pad-lg" onSubmit={submit} noValidate initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 }}>
          {mode !== "reset" && <div style={{ marginBottom: 20 }}><Segmented id="auth" options={[["login", "Log in"], ["signup", "Sign up"]]} value={mode} onChange={switchMode} /></div>}
          <p className="small muted text-center" style={{ marginBottom: 16 }}>
            {mode === "reset" ? "Type your email and we’ll send you a link to choose a new password." : "👨‍👩‍👧 Grown-ups: make a family account, then add each child."}
          </p>
          {mode === "signup" && <Field label="Your name" placeholder="e.g. Sam" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />}
          <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
          {mode !== "reset" && <Field label="Password" type="password" placeholder="••••••" value={pass} onChange={e => setPass(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
          {mode === "signup" && <label className="consent">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>I’m the child’s parent or guardian (18+), and I agree to the{" "}
              <button type="button" className="link-btn" style={{ padding: 0 }} onClick={() => setShowPrivacy(true)}>privacy notice & terms</button>.</span>
          </label>}
          {error && <div className="form-error" role="alert">{error}</div>}
          {notice && <div className="notice notice--good" role="status">{notice}</div>}
          <Button type="submit" variant="sun" size="lg" block disabled={busy}>
            {mode === "login" ? "Log in 🚀" : mode === "signup" ? "Create account 🌟" : "Send reset link"}
          </Button>
          {mode === "login" && services.kind === "cloud" && <div className="text-center" style={{ marginTop: 12 }}>
            <button type="button" className="link-btn small" onClick={() => switchMode("reset")}>Forgot your password?</button>
          </div>}
          {mode === "reset" && <div className="text-center" style={{ marginTop: 12 }}>
            <button type="button" className="link-btn small" onClick={() => switchMode("login")}>← Back to log in</button>
          </div>}
        </motion.form>

        <p className="text-center small muted" style={{ marginTop: 16 }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" className="link-btn" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Make an account" : "Log in"}</button>
        </p>
        <p className="text-center tiny muted" style={{ marginTop: 6, opacity: 0.8 }}>
          {services.kind === "cloud" ? "Progress is saved securely and syncs across your family’s devices." : "Everything is saved on this device only."}{" "}
          <button type="button" className="link-btn tiny" style={{ padding: 0 }} onClick={() => setShowPrivacy(true)}>Privacy</button>
        </p>
        {showPrivacy && <PrivacyNotice onClose={() => setShowPrivacy(false)} />}
      </div>
    </div>
  </div>;
}
