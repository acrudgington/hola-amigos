"use client";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { catalog } from "@/lib/catalog";
import { Reveal, SectionHeading } from "./Reveal";
import { ChatDemo } from "./ChatDemo";

export function Marquee() {
  const items = ["Automatic patching", "EDR antivirus", "WhatsApp helpdesk", "Microsoft 365", "Google Workspace", "Cloud backup", "DMARC & email health", "Phishing training", "Cyber Essentials", "On-site in the Costa Blanca"];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-ink/60 py-5">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-xl font-semibold text-mist/80">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-10">{t}<span className="text-coral">✦</span></span>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Free health check", body: "We scan your domain, email security and setup, then send a plain-English report. No obligation, no jargon." },
  { n: "02", title: "Switch on in a day", body: "We install a tiny agent on each device, connect Microsoft 365 or Google, and turn on patching, protection and backups." },
  { n: "03", title: "Just message us", body: "WhatsApp, email or the portal, 24/7. The AI fixes most things in minutes. A human engineer handles the rest." },
];

export function HowItWorks() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-32">
      <SectionHeading kicker="How it works" title={<>Grown-up IT, <span className="text-gradient">minus the faff</span></>} />
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12}>
              <div className="glass group relative flex gap-6 overflow-hidden rounded-3xl p-7">
                <span className="font-display text-6xl font-extrabold leading-none text-white/[0.08] transition-colors duration-500 group-hover:text-coral/40">{s.n}</span>
                <div>
                  <h3 className="font-display text-2xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-mist">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} className="relative">
          <div className="absolute -inset-10 -z-10 rounded-full bg-coral/20 blur-[90px]" />
          <ChatDemo />
          <p className="mt-4 text-center text-xs text-mist">Example of a typical WhatsApp fix. Names are illustrative.</p>
        </Reveal>
      </div>
    </section>
  );
}

const AUTOMATION_LABEL: Record<string, { label: string; cls: string }> = {
  full: { label: "Fully automated", cls: "bg-sea/15 text-sea" },
  high: { label: "Mostly automated", cls: "bg-sun/15 text-sun" },
  partial: { label: "AI + engineer", cls: "bg-coral/15 text-coral" },
  human: { label: "Real humans", cls: "bg-white/10 text-sand" },
};
const ICONS: Record<string, string> = {
  helpdesk: "M4 5h16v11H8l-4 4z", patching: "M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4",
  security: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", monitoring: "M3 12h4l3-7 4 14 3-7h4",
  cloud: "M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 18z", backup: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3",
  "email-health": "M3 6h18v12H3zM3 6l9 7 9-7", training: "M12 4l10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5",
  compliance: "M9 12l2 2 4-4M7 3h10l4 4v14H3V3z", vcio: "M4 19V9m6 10V5m6 14v-7m4 7H2", onsite: "M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
};

function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const bg = useMotionTemplate`radial-gradient(380px circle at ${x}px ${y}px, rgba(255,200,87,0.14), transparent 70%)`;
  return (
    <div onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set(e.clientX - r.left); y.set(e.clientY - r.top); }}
      className={`glass group relative overflow-hidden rounded-3xl p-7 transition-transform duration-500 hover:-translate-y-1 ${className}`}>
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Services() {
  return (
    <section id="services" className="relative mx-auto max-w-6xl px-4 py-32">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-dusk/60 blur-[120px]" />
      <SectionHeading kicker="What we do" title={<>Everything a small business needs. <span className="text-gradient">Mostly on autopilot.</span></>}
        sub="Machines handle the repetitive work: patching, monitoring, backups and first-line fixes. Our engineers spend their time where a human actually helps." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.services.map((s, i) => {
          const a = AUTOMATION_LABEL[s.automation];
          const wide = i === 0 || i === 6;
          return (
            <Reveal key={s.id} delay={(i % 3) * 0.08} className={wide ? "lg:col-span-2" : ""}>
              <SpotlightCard className="h-full">
                <div className="mb-5 flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sun/25 to-coral/25 ring-1 ring-white/10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC857" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[s.id]} /></svg>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.cls}`}>{a.label}</span>
                </div>
                <h3 className="font-display text-2xl font-bold">{s.name}</h3>
                <p className="mt-3 text-mist">{s.summary}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {s.examples.map((e) => <li key={e} className="rounded-full bg-white/5 px-3 py-1 text-xs text-sand/80">{e}</li>)}
                </ul>
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function Regions() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24">
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1b2a6b] to-[#0d1330] p-10 ring-1 ring-white/10">
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#6f8cff]/30 blur-3xl" />
            <p className="text-5xl">🇬🇧</p>
            <h3 className="mt-6 font-display text-3xl font-bold">Across the UK</h3>
            <p className="mt-3 text-mist">Fully remote support for offices, shops, clinics and practices anywhere in the UK, with vetted local partners for on-site jobs. Cyber Essentials ready.</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#ff7a59] via-[#c2416b] to-[#3a1d6e] p-10 ring-1 ring-white/10">
            <div className="absolute -bottom-16 -right-8 h-64 w-64 rounded-full bg-sun/40 blur-3xl" />
            <p className="text-5xl">🇪🇸</p>
            <h3 className="mt-6 font-display text-3xl font-bold">On the Costa Blanca</h3>
            <p className="mt-3 text-sand/90">From Dénia to Torrevieja, we're British-run, speak your language and also speak fluent Spanish ISP. On-site visits when you need them. GDPR & LOPDGDD sorted.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const FAQS = [
  ["Is it really AI answering?", "Yes. Our AI helpdesk answers first, 24/7, and it's very good at the everyday stuff. It always tells you it's an AI, and a human engineer takes over whenever it's needed or whenever you ask."],
  ["What if something needs a person on site?", "On the Costa Blanca we come to you. In the UK we use vetted local partners. Siesta includes two visits a year, otherwise on-site is billed hourly."],
  ["Do we need to sign a long contract?", "No. Plans are monthly rolling with 30 days' notice. Pay annually and you get two months free, with onboarding waived."],
  ["We already have someone who 'does our IT'…", "Brilliant. We can work alongside them, handling patching, security and the 2am WhatsApps, so they can focus on the bigger stuff."],
  ["Is our data safe with an AI?", "The AI only sees what's needed to fix your issue, never asks for passwords, and sensitive actions like password resets require identity checks. Data is processed under GDPR with a signed DPA."],
  ["Can you help with Spanish things like Movistar, Digi or Lowi?", "Yes, we deal with Spanish ISPs, routers and fibre engineers all the time, in Spanish, so you don't have to."],
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-32">
      <SectionHeading kicker="FAQ" title="Questions, answered" />
      <div className="space-y-3">
        {FAQS.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.05}>
            <details className="glass group rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-semibold">
                {q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-mist">{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
