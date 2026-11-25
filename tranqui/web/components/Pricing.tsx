"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { catalog, money, type Plan } from "@/lib/catalog";
import { useRegion, } from "./RegionProvider";
import { RegionToggle } from "./Nav";
import { Reveal, SectionHeading } from "./Reveal";

function Price({ value }: { value: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={value} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="inline-block">
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export function Pricing() {
  const { region } = useRegion();
  const [annual, setAnnual] = useState(false);
  const cur = region === "UK" ? "GBP" : "EUR";
  const vat = region === "UK" ? catalog.currency.UK.vatNote : catalog.currency["Costa Blanca"].vatNote;
  const perMonth = (p: Plan) => {
    const v = annual ? Math.round((p.price[cur] * 10) / 12 * 100) / 100 : p.price[cur];
    return `${region === "UK" ? "£" : "€"}${Number.isInteger(v) ? v : v.toFixed(2)}`;
  };

  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-4 py-32">
      <SectionHeading kicker="Pricing" title={<>Simple, per-person pricing. <span className="text-gradient">No surprises.</span></>}
        sub={`Every plan includes the 24/7 AI helpdesk. Minimum 3 users. ${vat}`} />
      <Reveal className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <RegionToggle />
        <button onClick={() => setAnnual(!annual)} className="glass flex items-center gap-3 rounded-full px-4 py-2 text-sm" aria-pressed={annual}>
          <span className={`relative h-5 w-9 rounded-full transition-colors ${annual ? "bg-sea" : "bg-white/20"}`}>
            <motion.span layout className="absolute top-0.5 h-4 w-4 rounded-full bg-white" style={{ left: annual ? 18 : 2 }} />
          </span>
          Pay annually <span className="rounded-full bg-sea/15 px-2 py-0.5 text-xs font-semibold text-sea">2 months free</span>
        </button>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-3">
        {(catalog.plans as Plan[]).map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <div className={`relative flex h-full flex-col rounded-[2rem] p-8 ${p.featured ? "bg-gradient-to-b from-[#2b1b5e] to-ink ring-glow" : "glass"}`}>
              {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-sun to-coral px-3 py-1 text-xs font-bold text-night">Most popular</span>}
              <h3 className="font-display text-3xl font-bold">{p.name}</h3>
              <p className="mt-1 text-mist">{p.tagline}</p>
              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-6xl font-extrabold tracking-tight"><Price value={perMonth(p)} /></span>
                <span className="mb-2 text-sm text-mist">per user<br />/ month</span>
              </div>
              <p className="mt-2 text-sm text-sea">Response: {p.response}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm">
                    <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38E1C7" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={`#check`} className={`mt-8 rounded-full py-3.5 text-center font-semibold transition ${p.featured ? "bg-sand text-night hover:bg-sun" : "bg-white/10 hover:bg-white/20"}`}>
                Start with a free check
              </a>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div className="glass mt-6 flex flex-col items-start justify-between gap-4 rounded-[2rem] p-8 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-2xl font-bold">{catalog.payg.name}: {catalog.payg.tagline}</h3>
            <p className="mt-1 text-mist">{catalog.payg.notes}</p>
          </div>
          <p className="shrink-0 font-display text-3xl font-bold">{money(catalog.payg.price, region)}<span className="ml-2 text-sm font-normal text-mist">first 30 min</span></p>
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.addons.filter((a) => a.price[cur] > 0).map((a) => (
            <div key={a.id} className="rounded-2xl border border-white/10 p-5">
              <p className="text-sm text-mist">{a.name}</p>
              <p className="mt-2 font-display text-xl font-bold">{money(a.price, region)} <span className="text-xs font-normal text-mist">{a.unit}</span></p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-mist">{catalog.terms.guarantee}. {catalog.terms.contract}.</p>
      </Reveal>
    </section>
  );
}
