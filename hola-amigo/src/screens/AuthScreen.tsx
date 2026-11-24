import { useState } from "react";
import { db } from "../domain/progress.ts";
import { motion } from "framer-motion";
import { Button, Field, Segmented } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";

export function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = m => { setMode(m); setError(""); };

  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    setError("");
    const em = email.toLowerCase().trim();
    if (!em || !pass || (mode === "signup" && !name.trim())) return setError("Please fill in all the boxes!");
    if (!/^\S+@\S+\.\S+$/.test(em)) return setError("That email doesn’t look quite right.");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (pass.length < 6) return setError("Password needs at least 6 characters.");
        const parent = await db.createParent(name.trim(), em, pass);
        if (!parent) return setError("An account with this email already exists — try logging in!");
        onLogin(parent);
      } else {
        const res = await db.login(em, pass);
        if (typeof res === "string") return setError(res);
        onLogin(res);
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
          <p className="muted" style={{ marginTop: 6 }}>Spanish adventures for curious kids · 100 lessons · 800 words</p>
        </div>

        <motion.form className="card card--pad-lg" onSubmit={submit} noValidate initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 }}>
          <div style={{ marginBottom: 20 }}><Segmented id="auth" options={[["login", "Log in"], ["signup", "Sign up"]]} value={mode} onChange={switchMode} /></div>
          <p className="small muted text-center" style={{ marginBottom: 16 }}>👨‍👩‍👧 Grown-ups: make a family account, then add each child.</p>
          {mode === "signup" && <Field label="Your name" placeholder="e.g. Sam" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />}
          <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
          <Field label="Password" type="password" placeholder="••••••" value={pass} onChange={e => setPass(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          {error && <div className="form-error" role="alert">{error}</div>}
          <Button type="submit" variant="sun" size="lg" block disabled={busy}>{mode === "login" ? "Log in 🚀" : "Create account 🌟"}</Button>
        </motion.form>

        <p className="text-center small muted" style={{ marginTop: 16 }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" className="link-btn" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Make an account" : "Log in"}</button>
        </p>
        <p className="text-center tiny muted" style={{ marginTop: 6, opacity: 0.8 }}>Everything is saved on this device only.</p>
      </div>
    </div>
  </div>;
}
