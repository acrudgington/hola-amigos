"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/Logo";
import { OPS_URL, WHATSAPP } from "@/lib/catalog";

type Msg = { direction: "in" | "out"; body: string; created_at: string };
type Ticket = { id: number; subject: string; status: string; priority: string };

function Portal() {
  const params = useSearchParams();
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [form, setForm] = useState({ name: "", email: "", subject: "", description: "" });
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const id = params.get("ticket"), t = params.get("t");
    if (id && t) { setTicketId(Number(id)); setToken(t); }
  }, [params]);

  useEffect(() => {
    if (!ticketId || !token) return;
    const load = () => fetch(`${OPS_URL}/api/portal/tickets/${ticketId}?t=${token}`).then((r) => r.json()).then((d) => { setTicket(d.ticket); setMsgs(d.messages ?? []); }).catch(() => {});
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, [ticketId, token]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch(`${OPS_URL}/api/portal/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setTicketId(d.ticketId); setToken(d.token);
      window.history.replaceState(null, "", `/support?ticket=${d.ticketId}&t=${d.token}`);
    } catch { setErr("We couldn't open the ticket. Please WhatsApp us instead."); }
    finally { setBusy(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!reply.trim()) return; setBusy(true);
    const message = reply; setReply("");
    setMsgs((m) => [...m, { direction: "in", body: message, created_at: new Date().toISOString() }]);
    await fetch(`${OPS_URL}/api/portal/tickets/${ticketId}/reply?t=${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }).catch(() => {});
    const d = await fetch(`${OPS_URL}/api/portal/tickets/${ticketId}?t=${token}`).then((r) => r.json()).catch(() => null);
    if (d) { setTicket(d.ticket); setMsgs(d.messages); }
    setBusy(false);
  }

  const input = "mt-2 w-full rounded-xl bg-white/10 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-sun";

  return (
    <main className="min-h-screen bg-[radial-gradient(90%_60%_at_50%_0%,#2b1b5e_0%,#070b1f_70%)] px-4 pb-20 pt-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between"><Link href="/"><Logo /></Link>
        <a href={`https://wa.me/${WHATSAPP}`} className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-night">WhatsApp support</a></div>
      <div className="mx-auto mt-14 max-w-3xl">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">Support portal</h1>
        <p className="mt-3 text-mist">Tell us what's up. Our AI helpdesk replies in seconds, 24/7, and hands over to an engineer whenever needed.</p>

        {!ticketId ? (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={create} className="glass mt-10 space-y-5 rounded-3xl p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm">Your name<input className={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="text-sm">Work email<input className={input} required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            </div>
            <label className="block text-sm">What's the problem?<input className={input} required placeholder="e.g. Printer says offline" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="block text-sm">Details<textarea className={`${input} min-h-36`} required placeholder="What happened, any error messages, which device…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <button disabled={busy} className="w-full rounded-xl bg-sand py-4 font-semibold text-night hover:bg-sun disabled:opacity-60">{busy ? "Opening ticket…" : "Open ticket"}</button>
            {err && <p className="text-sm text-coral">{err}</p>}
            <p className="text-xs text-mist">🔒 Never send passwords here. For an emergency (e.g. you clicked a suspicious link), say so and we'll prioritise it.</p>
          </motion.form>
        ) : (
          <div className="glass mt-10 overflow-hidden rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-6 py-4">
              <div><p className="text-xs text-mist">Ticket #{ticketId}</p><p className="font-semibold">{ticket?.subject ?? "Loading…"}</p></div>
              {ticket && <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">{ticket.status.replace("_", " ")} · {ticket.priority}</span>}
            </div>
            <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto p-6" data-lenis-prevent>
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.direction === "in" ? "self-end bg-sea/90 text-night" : "self-start bg-white/10"}`}>{m.body}</div>
              ))}
              {busy && <div className="self-start rounded-2xl bg-white/10 px-4 py-2 text-sm text-mist">typing…</div>}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-4">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" className="flex-1 rounded-xl bg-white/10 px-4 py-3 outline-none focus:ring-1 focus:ring-sun" />
              <button disabled={busy} className="rounded-xl bg-sand px-5 font-semibold text-night disabled:opacity-50">Send</button>
            </form>
            <p className="px-6 pb-4 text-xs text-mist">Bookmark this page to come back to your ticket.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SupportPage() {
  return <Suspense><Portal /></Suspense>;
}
