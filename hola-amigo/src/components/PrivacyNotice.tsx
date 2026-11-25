// Privacy notice & short terms, shown at sign-up and in the grown-up dashboard,
// in English or Castilian Spanish. The words live in src/legal/privacyNotice.ts.
import { Fragment, useState } from "react";
import { parseBold, privacyNotice, type LegalLang } from "../legal/privacyNotice.ts";
import { services } from "../services/index.ts";
import { Button, Modal, Segmented } from "./ui.tsx";

const Rich = ({ text }: { text: string }) =>
  <>{parseBold(text).map((p, i) => p.bold ? <b key={i}>{p.text}</b> : <Fragment key={i}>{p.text}</Fragment>)}</>;

export function PrivacyNotice({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<LegalLang>(() =>
    typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");
  const n = privacyNotice(lang, { cloud: services.kind === "cloud" });
  return <Modal onClose={onClose} labelledBy="privacy-title">
    <div className="legal" lang={lang}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="eyebrow">{n.version}</div>
        <Segmented id="legal-lang" options={[["en", "English"], ["es", "Español"]]} value={lang} onChange={v => setLang(v as LegalLang)} />
      </div>
      <h2 id="privacy-title" className="h2" style={{ margin: "8px 0 12px" }}>{n.title}</h2>
      <p className="legal__draft">{n.draft}</p>
      {n.sections.map(s => <Fragment key={s.title}>
        <h3>{s.title}</h3>
        {s.blocks.map((b, i) => typeof b === "string"
          ? <p key={i}><Rich text={b} /></p>
          : <ul key={i}>{b.map((item, j) => <li key={j}><Rich text={item} /></li>)}</ul>)}
      </Fragment>)}
    </div>
    <Button variant="sun" block onClick={onClose} style={{ marginTop: 16 }}>{n.close}</Button>
  </Modal>;
}
