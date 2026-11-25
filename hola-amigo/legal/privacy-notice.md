# ¡Hola, Amigo! — Privacy notice & terms (review copy)

**Version 2026-11-25-draft** · This is the text parents see in the app (cloud
version), laid out for review. The app's copy is in
`src/components/PrivacyNotice.tsx`. Send changes back and both get updated
together. Words in [square brackets] still need filling in.

---

### Who we are
¡Hola, Amigo! is run by **[Your legal or trading name]** (NIF/NIE **[NIF / NIE]**),
**[Postal address in Spain]**. We are responsible for (the "controller" of) the
personal data described here. Contact us any time at **help@hola-amigos.es**.

### Who this is for
¡Hola, Amigo! is a Spanish course for children, set up and managed by a parent
or guardian aged 18 or over. Children don't have their own accounts, logins or
email addresses. In Spain, children under 14 can't consent to the use of their
data themselves, so we only work with a parent or guardian, who agrees on their
behalf when signing up.

### What we keep
- **About you (the grown-up):** your name, email address and password
  (passwords are handled by Google Firebase Authentication; we never see them),
  and the date and version of this notice you agreed to.
- **About each child:** only the first name or nickname you type, the animal
  picture you choose, and their learning progress (stars, words practised,
  streaks and badges).
- We do **not** collect children's photos, voice recordings, location,
  contacts, school or date of birth.
- **On your device:** the app saves your settings and a copy of your progress
  in the browser's storage so it works offline. This is essential for the app
  to work; we don't use cookies or anything else for tracking or advertising.

### Why we use it, and our legal basis
- **To provide the course you signed up for:** your account, each child's
  progress, syncing between devices, and service emails such as confirming your
  address or resetting your password. Legal basis: our contract with you (GDPR
  article 6.1.b). You choose to add each child as their parent or guardian.
- **To keep the service safe and working**, for example blocking repeated wrong
  passwords. Legal basis: our legitimate interest in running a secure service
  (article 6.1.f).
- We do **not** use anyone's data for advertising, profiling or selling, and we
  won't send marketing emails unless you separately ask for them.

### The microphone
The "Say it!" game uses your browser's built-in speech recognition to check
pronunciation. We never record or store your child's voice. Some browsers (for
example Chrome) send the audio to the browser maker (such as Google) to turn
speech into text, under that company's own privacy terms. You can skip this
game at any time.

### Where it's stored and who helps us
- Families' data (children and progress) is stored in Google Cloud Firestore in
  **Madrid, Spain**, with a copy on each of your devices so lessons work
  offline.
- Logins (your email and password) are handled by Google Firebase
  Authentication, which may process them outside the EU, including in the
  United States.
- The app is delivered by our web host, Vercel, which handles technical details
  such as your IP address to send you the website and protect it from attacks,
  and may do so outside the EU.
- Google and Vercel act only on our instructions under data processing
  agreements. Where data leaves the EU, it is protected by the European
  Commission's approved safeguards (the EU–US Data Privacy Framework and/or
  Standard Contractual Clauses).

### How long we keep it
For as long as you have an account. When you delete your account (or a child's
profile), it is removed from our database straight away; any remaining copies
in our providers' backups are erased in line with their standard deletion
periods. When paid plans start, we'll keep billing records for as long as
Spanish tax law requires.

### What we never do
- No adverts, no tracking, no selling or sharing data with anyone for their own
  purposes.
- No chat, messaging, public profiles or contact with strangers.
- No pushy notifications or tricks to keep children playing. Streaks and
  rewards are gentle and optional.
- Fonts, voices and pictures are served from the app itself, not third-party
  sites.

### Your rights
- You can ask to **see**, **correct**, **delete** or **restrict** the use of your
  family's data, **object** to how we use it, or receive it in a portable format.
- **Download** everything we hold and **delete** your account permanently, any
  time, from the grown-up dashboard.
- For anything else, email **help@hola-amigos.es**. It's free, and we'll reply
  within one month.
- If you're unhappy with how we handle your data, you can complain to the
  Agencia Española de Protección de Datos (AEPD), www.aepd.es.

### Plans
The first world is free. Full access costs £5 a month or £40 a year; you can
cancel any time.

### Terms in short
Please use ¡Hola, Amigo! for your own family's learning, keep your password
private, and be the grown-up in charge of your child's use. We may update this
notice; if anything important changes we'll tell you and ask you to agree again.

---

## Questions for the reviewer

1. **Business details.** Legal or trading name, NIF/NIE and address. Are you
   trading as an *autónomo* or through a company (S.L.)?
2. **Currency.** Families in Spain will mostly pay in euros. Keep £5 / £40, or
   switch to euros (e.g. €5.99 / €49)?
3. **Spanish version.** Spanish consumer law expects terms to be available in
   Spanish. Should we add a Spanish translation of this notice?
4. **Inactive accounts.** Should accounts nobody has used for, say, 2 years be
   deleted automatically (after an email warning)? Not built yet. Say if you
   want it and I'll build it and add it here.
5. **Re-agreeing.** The notice promises to ask parents to agree again after an
   important change. The consent version is recorded, but the "please agree
   again" prompt isn't built yet. I'll add it before launch.
6. **Age of consent.** This follows Spain's current rule (under 14 needs a
   parent). Spain has been considering raising this to 16; because a parent
   always consents here, that wouldn't change how the app works.
