"use client";
import { motion } from "motion/react";
import { useState } from "react";
import { OPS_URL } from "@/lib/catalog";
import { useRegion } from "./RegionProvider";
import { Reveal } from "./Reveal";

type Result = { domain: string; score: number | null; checks: { label: string; ok: boolean | null; detail: string }[] };

export function HealthCheck() {
  const { region } = useRegion();
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch(`${OPS_URL}/api/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, email, consent, region }) });
      if (!res.ok) throw new Error();
      setResult(await res.json());
      setState("done");
    } catch { setState("error"); }
  }

  return (
    <section id="check" className="relative mx-auto max-w-6xl px-4 py-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#ff7a59] via-[#b8386b] to-[#2b1b5e] p-8 sm:p-14">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sun/40 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sand/80">Free · 30 seconds · no sales call</p>
              <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] sm:text-6xl">How healthy is your business tech?</h2>
              <p className="mt-5 text-lg text-sand/90">Pop in your website. We'll check your email security (SPF, DKIM, DMARC), HTTPS and a few other basics, and send a plain-English report with what to fix.</p>
            </div>
            <div className="rounded-3xl bg-night/70 p-6 backdrop-blur-xl ring-1 ring-white/15">
              {state !== "done" ? (
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm">Your website
                    <input required value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourbusiness.co.uk"
                      className="mt-2 w-full rounded-xl bg-white/10 px-4 py-3.5 outline-none ring-1 ring-white/10 placeholder:text-mist/60 focus:ring-sun" />
                  </label>
                  <label className="block text-sm">Email for the full report
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.co.uk"
                      className="mt-2 w-full rounded-xl bg-white/10 px-4 py-3.5 outline-none ring-1 ring-white/10 placeholder:text-mist/60 focus:ring-sun" />
                  </label>
                  <label className="flex gap-3 text-xs text-mist">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#ffc857]" />
                    Happy for Tranqui to email me occasional tips and offers. (Optional, and you can unsubscribe any time.)
                  </label>
                  <button disabled={state === "loading"} className="w-full rounded-xl bg-sand py-4 font-semibold text-night transition hover:bg-sun disabled:opacity-60">
                    {state === "loading" ? "Checking…" : "Run my free check"}
                  </button>
                  {state === "error" && <p className="text-sm text-coral">Couldn't run the check just now. Try again, or WhatsApp us.</p>}
                  <p className="text-[11px] text-mist/70">We only check public records. See our <a className="underline" href="/privacy">privacy notice</a>.</p>
                </form>
              ) : result && (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="flex items-center gap-4">
                    <div className="grid h-20 w-20 place-items-center rounded-full font-display text-3xl font-extrabold"
                      style={{ background: `conic-gradient(#38E1C7 ${(result.score ?? 0) * 3.6}deg, rgba(255,255,255,.1) 0)` }}>
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-night">{result.score ?? "?"}</span>
                    </div>
                    <div><p className="font-display text-xl font-bold">{result.domain}</p><p className="text-sm text-mist">Full report on its way to your inbox.</p></div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {result.checks.map((c) => (
                      <li key={c.label} className="flex gap-3 text-sm">
                        <span className={c.ok === null ? "text-mist" : c.ok ? "text-sea" : "text-coral"}>{c.ok === null ? "?" : c.ok ? "✓" : "✕"}</span>
                        <span><b>{c.label}.</b> <span className="text-mist">{c.detail}</span></span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
