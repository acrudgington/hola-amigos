"use client";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { WHATSAPP } from "@/lib/catalog";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

const words = ["IT,", "sorted."];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden">
      {/* Sky */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_100%,#ff7a59_0%,#b8386b_22%,#3a1d6e_48%,#0d1330_72%,#070b1f_100%)]" />
      <div className="absolute inset-0"><Hero3D /></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-night" />

      <motion.div style={reduce ? undefined : { y, opacity }} className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center px-4 pb-40 pt-32 text-center">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-sand sm:text-sm">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sea opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sea" /></span>
          AI helpdesk online now · UK & Costa Blanca
        </motion.p>
        <h1 className="font-display text-[clamp(3.4rem,11vw,9.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
          {words.map((w, i) => (
            <motion.span key={w} className="mr-[0.2em] inline-block" initial={{ opacity: 0, y: 60, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>{w}</motion.span>
          ))}
          <br />
          <motion.span className="text-gradient inline-block" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            Now relax.
          </motion.span>
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 max-w-2xl text-lg text-sand/90 [text-shadow:0_2px_18px_rgb(7_11_31/0.9)] sm:text-xl">
          British-run IT support for small businesses. A 24/7 AI helpdesk on WhatsApp that fixes most problems in minutes, with automatic security
          and patching, and real engineers whenever you need a human.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a href="#check" className="group relative overflow-hidden rounded-full bg-sand px-7 py-4 font-semibold text-night ring-glow transition hover:scale-[1.03]">
            <span className="relative z-10">Get a free tech health check</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-sun to-coral transition-transform duration-500 group-hover:translate-x-0" />
          </a>
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Tranqui! I'd like to know more.")}`} target="_blank" rel="noopener"
            className="glass rounded-full px-7 py-4 font-semibold transition hover:bg-white/15">
            WhatsApp us →
          </a>
        </motion.div>
      </motion.div>

    </section>
  );
}
