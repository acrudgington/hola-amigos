# Privacy notice: notes for the review

- English: [privacy-notice.md](privacy-notice.md) · Español: [aviso-de-privacidad.md](aviso-de-privacidad.md)
- In the app: sign-up screen → "Privacy" link, or grown-up dashboard → Account & privacy.
  There's an English / Español switch at the top; it opens in Spanish on Spanish-language devices.
- To change the wording, edit `src/legal/privacyNotice.ts` (both languages are side by side),
  then run `npm run legal:export` to refresh these copies.

## Still to settle

1. **Business details.** Legal or trading name, NIF/NIE and postal address
   (`PRIVACY.controller` in `src/config.ts`). Are you an *autónomo* or a company (S.L.)?
2. **Right of withdrawal (desistimiento).** EU consumers normally get 14 days to cancel an
   online purchase. For digital content that starts straight away, this right can be lost,
   but only if the parent expressly agrees at checkout. That gets wired in with payments
   (step 5); the notice will need a line about it then.
3. **Inactive accounts.** Should accounts unused for, say, 2 years be deleted automatically
   (after an email warning)? Not built yet.
4. **Re-agreeing.** The notice promises to ask parents to agree again after an important
   change. The consent version is recorded, but the "please agree again" prompt isn't built
   yet. It will be before launch.
5. **Age of consent.** This follows Spain's current rule (under 14 needs a parent). Spain has
   been considering raising it to 16; since a parent always consents here, the app wouldn't
   need to change.
6. **Aviso legal.** Spanish law (LSSI) also requires a short legal notice on the website with
   the same business details. I can add it once you have them.

## Settled

- Contact email: help@hola-amigos.es
- Prices: €2 a month or €20 a year
- Data location: Firestore in Madrid
- Spanish version: done (Castilian, informal "tú")
