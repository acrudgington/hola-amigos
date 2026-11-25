"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { OPS_URL, WHATSAPP } from "@/lib/catalog";

type Msg = { from: "me" | "bot"; text: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hola! 👋 I'm Tranqui's AI assistant. Ask me anything about IT support, prices or a problem you're having right now." }]);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !contact.trim()) return;
    const message = text.trim();
    setMsgs((m) => [...m, { from: "me", text: message }]);
    setText(""); setBusy(true);
    try {
      const res = await fetch(`${OPS_URL}/api/enquiry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact, message }) });
      const data = await res.json();
      setMsgs((m) => [...m, { from: "bot", text: data.reply ?? "Sorry, something went wrong. Try WhatsApp?" }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: "I'm having trouble connecting. Message us on WhatsApp instead and we'll reply straight away." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass mb-3 flex h-[32rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between bg-gradient-to-r from-sun/20 to-coral/20 px-5 py-4">
              <div><p className="font-semibold">Chat with Tranqui</p><p className="text-xs text-mist">AI assistant · humans on standby</p></div>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-night">WhatsApp</a>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" data-lenis-prevent>
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${m.from === "me" ? "self-end bg-sea/90 text-night" : "self-start bg-white/10"}`}>{m.text}</div>
              ))}
              {busy && <div className="self-start rounded-2xl bg-white/10 px-4 py-2 text-sm text-mist">typing…</div>}
            </div>
            <form onSubmit={send} className="space-y-2 border-t border-white/10 p-3">
              {msgs.length < 3 && <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Your email or WhatsApp number" className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sun" />}
              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sun" />
                <button disabled={busy} className="rounded-xl bg-sand px-4 text-sm font-semibold text-night disabled:opacity-50">Send</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(!open)} aria-label={open ? "Close chat" : "Open chat"}
        className="ml-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-sun to-coral text-night shadow-xl shadow-coral/40">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d={open ? "M6 6l12 12M18 6L6 18" : "M4 5h16v11H8l-4 4z"} /></svg>
      </motion.button>
    </div>
  );
}
