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
