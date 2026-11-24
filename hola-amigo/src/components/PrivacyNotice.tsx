// Plain-English privacy notice shown at sign-up and in the grown-up dashboard.
// DRAFT: have it reviewed (ideally by someone qualified in UK GDPR and the
// Children's Code) and fill in the business details before launch.
import { APP, PRICING, PRIVACY, formatPrice } from "../config.ts";
import { services } from "../services/index.ts";
import { Button, Modal } from "./ui.tsx";

export function PrivacyNotice({ onClose }: { onClose: () => void }) {
  const cloud = services.kind === "cloud";
  return <Modal onClose={onClose} labelledBy="privacy-title">
    <div className="legal">
      <div className="eyebrow">Version {PRIVACY.version}</div>
      <h2 id="privacy-title" className="h2" style={{ margin: "4px 0 12px" }}>Privacy notice & terms</h2>
      <p className="legal__draft">Draft for review before launch.</p>

      <h3>Who this is for</h3>
      <p>{APP.name} is a Spanish course for children, set up and managed by a parent or guardian. Children don’t have their own accounts, logins or email addresses.</p>

      <h3>What we keep</h3>
      <ul>
        <li><b>About you (the grown-up):</b> your name, email address and password{cloud ? " (passwords are handled by Google Firebase Authentication and never seen by us)" : " (stored scrambled on this device only)"}, and the date you agreed to this notice.</li>
        <li><b>About each child:</b> only the first name or nickname you type, the animal picture you choose, and their learning progress (stars, words practised, streaks and badges).</li>
        <li>We do <b>not</b> collect children’s photos, locations, contacts, school or birthdays.</li>
      </ul>

      <h3>The microphone</h3>
      <p>The “Say it!” game uses your browser’s built-in speech recognition to check pronunciation. We never record or store your child’s voice. Some browsers (for example Chrome) send the audio to the browser maker to turn speech into text; you can skip this game at any time.</p>

      <h3>Where it’s stored</h3>
      <p>{cloud
        ? "Accounts and progress are stored with Google Firebase so they sync across your family’s devices. A copy is kept on each device so lessons work offline."
        : "Everything is stored on this device only. Clearing the browser’s data deletes it."}</p>

      <h3>What we never do</h3>
      <ul>
        <li>No adverts, no tracking, no selling or sharing data with anyone.</li>
        <li>No pushy notifications or tricks to keep children playing. Streaks and rewards are gentle and optional.</li>
        <li>Fonts, voices and pictures are served from the app itself, not third-party sites.</li>
      </ul>

      <h3>Your choices and rights</h3>
      <ul>
        <li><b>Download</b> everything we hold about your family, any time, from the grown-up dashboard.</li>
        <li><b>Delete</b> your account and all your children’s data permanently from the same place.</li>
        <li>Ask us anything or make a request: <b>{PRIVACY.contactEmail}</b>. You can also complain to the UK Information Commissioner’s Office (ico.org.uk).</li>
      </ul>

      <h3>Plans</h3>
      <p>The first world is free. Full access costs {formatPrice(PRICING.plans[0].price)} a month or {formatPrice(PRICING.plans[1].price)} a year; you can cancel any time.</p>

      <h3>Terms in short</h3>
      <p>Please use {APP.name} for your own family’s learning, keep your password private, and be the grown-up in charge of your child’s use. We may update this notice; if anything important changes we’ll ask you to agree again.</p>
    </div>
    <Button variant="sun" block onClick={onClose} style={{ marginTop: 16 }}>Got it</Button>
  </Modal>;
}
