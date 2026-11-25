"use client";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useRegion } from "./RegionProvider";

export function RegionToggle() {
  const { region, setRegion } = useRegion();
  return (
    <div className="glass relative flex rounded-full p-1 text-xs font-semibold" role="group" aria-label="Choose your region">
      {(["UK", "Costa Blanca"] as const).map((r) => (
        <button key={r} onClick={() => setRegion(r)} aria-pressed={region === r}
          className={`relative z-10 rounded-full px-3 py-1.5 transition-colors ${region === r ? "text-night" : "text-mist hover:text-sand"}`}>
          {region === r && <motion.span layoutId="region-pill" className="absolute inset-0 -z-10 rounded-full bg-sun" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          {r === "UK" ? "🇬🇧 UK" : "🇪🇸 Costa Blanca"}
        </button>
      ))}
    </div>
  );
}

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));
  const links = [["#services", "Services"], ["#pricing", "Pricing"], ["#check", "Free check"], ["#faq", "FAQ"]];
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-6 ${scrolled ? "glass shadow-2xl shadow-black/30" : ""}`}>
        <Link href="/" aria-label="Tranqui home"><Logo /></Link>
        <div className="hidden items-center gap-7 text-sm text-mist md:flex">
          {links.map(([href, label]) => <a key={href} href={href} className="transition-colors hover:text-sand">{label}</a>)}
          <Link href="/support" className="transition-colors hover:text-sand">Support portal</Link>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <RegionToggle />
          <a href="#check" className="rounded-full bg-sand px-4 py-2 text-sm font-semibold text-night transition hover:bg-sun">Get started</a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
        </button>
      </nav>
      {open && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto mt-2 flex max-w-6xl flex-col gap-4 rounded-3xl p-6 md:hidden">
          {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="text-lg">{label}</a>)}
          <Link href="/support" className="text-lg">Support portal</Link>
          <RegionToggle />
        </motion.div>
      )}
    </header>
  );
}
