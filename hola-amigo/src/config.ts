// ============================================================
// App-wide settings. Product decisions live here, not scattered in code.
// ============================================================

export const APP = {
  name: "¡Hola, Amigo!",
  // Families first; a schools edition comes later.
  audience: "families" as const,
} as const;

// Castilian (Spain) Spanish throughout: voices, pronunciation guides and
// speech recognition all use es-ES. Interface language is British English.
export const LANGUAGE = {
  target: "es-ES",
  targetName: "Spanish (Spain)",
  ui: "en-GB",
} as const;

// The privacy notice & terms version parents agree to at sign-up. Bump it when
// the text changes; the date of agreement is stored with each account.
export const PRIVACY = {
  // Bump this when the notice changes materially (the consent record stores it).
  version: "2026-11-25-draft",
  contactEmail: "help@hola-amigos.es",
  // The data controller (who is responsible for the data). TODO: fill in before launch.
  controller: {
    name: "[Your legal or trading name]",
    taxId: "[NIF / NIE]",
    address: "[Postal address in Spain]",
  },
  // Where Cloud Firestore keeps families' data (chosen when the database was created).
  dataLocation: "Madrid, Spain",
  authority: { name: "Agencia Española de Protección de Datos (AEPD)", site: "www.aepd.es" },
} as const;

// Subscription plans (wired to payments in step 5).
export const PRICING = {
  currency: "GBP",
  plans: [
    { id: "monthly", label: "Monthly", price: 5, interval: "month" as const },
    { id: "yearly", label: "Yearly", price: 40, interval: "year" as const, note: "Save £20 — 4 months free" },
  ],
  // The first world is free; everything else needs a subscription.
  freeLessonsUpTo: 8,
} as const;

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat(LANGUAGE.ui, { style: "currency", currency: PRICING.currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

// Which storage/auth backend to use. "local" keeps everything on this device;
// "firebase" is added in step 2 and switched on with VITE_BACKEND=firebase.
export const BACKEND: "local" | "firebase" = (import.meta.env.VITE_BACKEND as "local" | "firebase") || "local";

// ============================================================
// Voices. Every clip is pre-generated with Google Cloud Text-to-Speech
// (`npm run audio:generate`) and shipped as a small MP3. For each role the
// generator uses the first voice in `prefer` that Google offers, otherwise
// the best available voice of that gender (Chirp 3 HD › Studio › Neural2 ›
// WaveNet). Change a voice here and re-run the generator to re-record it.
// ============================================================
export interface VoiceSpec { languageCode: string; gender: "FEMALE" | "MALE"; prefer: string[]; rate: number }
export const AUDIO = {
  basePath: "/audio/",
  voices: {
    // Castilian teacher: every Spanish word, phrase and sentence.
    "es": { languageCode: "es-ES", gender: "FEMALE", prefer: ["es-ES-Chirp3-HD-Leda", "es-ES-Chirp3-HD-Aoede", "es-ES-Neural2-A"], rate: 0.88 },
    // British narrator: instructions, stories and questions.
    "en": { languageCode: "en-GB", gender: "FEMALE", prefer: ["en-GB-Chirp3-HD-Aoede", "en-GB-Chirp3-HD-Leda", "en-GB-Neural2-A"], rate: 0.95 },
    // Sol: cheerful, a boy's energy.
    "sol-es": { languageCode: "es-ES", gender: "MALE", prefer: ["es-ES-Chirp3-HD-Puck", "es-ES-Chirp3-HD-Fenrir", "es-ES-Neural2-B"], rate: 1.0 },
    "sol-en": { languageCode: "en-GB", gender: "MALE", prefer: ["en-GB-Chirp3-HD-Puck", "en-GB-Chirp3-HD-Fenrir", "en-GB-Neural2-B"], rate: 1.0 },
    // Luna: gentle and calm.
    "luna-es": { languageCode: "es-ES", gender: "FEMALE", prefer: ["es-ES-Chirp3-HD-Kore", "es-ES-Chirp3-HD-Zephyr", "es-ES-Neural2-E"], rate: 0.95 },
    "luna-en": { languageCode: "en-GB", gender: "FEMALE", prefer: ["en-GB-Chirp3-HD-Kore", "en-GB-Chirp3-HD-Zephyr", "en-GB-Neural2-C"], rate: 0.95 },
  } satisfies Record<string, VoiceSpec>,
} as const;
