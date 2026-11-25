// The generated review copies of the notice (see scripts/export-legal.ts).
import { noticeToMarkdown, privacyNotice } from "./privacyNotice.ts";

const HEADER = {
  en: "<!-- Generated from src/legal/privacyNotice.ts by `npm run legal:export`. Edit that file, not this one. -->\n\n",
  es: "<!-- Generado a partir de src/legal/privacyNotice.ts con `npm run legal:export`. Edita ese archivo, no este. -->\n\n",
};

export function legalFiles(): Record<string, string> {
  return {
    "legal/privacy-notice.md": HEADER.en + noticeToMarkdown(privacyNotice("en", { cloud: true })),
    "legal/aviso-de-privacidad.md": HEADER.es + noticeToMarkdown(privacyNotice("es", { cloud: true })),
  };
}
