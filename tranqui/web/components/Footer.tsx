import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h2 className="font-display text-[clamp(3rem,10vw,8rem)] font-extrabold leading-none tracking-tight">
          Ready to be <span className="text-gradient">tranqui?</span>
        </h2>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#check" className="rounded-full bg-sand px-7 py-4 font-semibold text-night transition hover:bg-sun">Free health check</a>
          <Link href="/support" className="glass rounded-full px-7 py-4 font-semibold">I need help now</Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 border-t border-white/10 px-4 py-10 text-sm text-mist md:flex-row">
        <Logo className="text-xl text-sand" />
        <p>{catalog.brand.contact.email} · WhatsApp {catalog.brand.contact.whatsapp}</p>
        <div className="flex gap-6"><Link href="/privacy">Privacy</Link><Link href="/support">Support</Link></div>
      </div>
      <p className="pb-8 text-center text-xs text-mist/60">© {new Date().getFullYear()} {catalog.brand.legalName}. Prices exclude VAT / IVA.</p>
    </footer>
  );
}
