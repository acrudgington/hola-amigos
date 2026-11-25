// Plain-English privacy notice shown at sign-up and in the grown-up dashboard.
// Written for Spain: EU GDPR + Spain's data protection law (LOPDGDD, Ley
// Orgánica 3/2018). DRAFT: have it reviewed and fill in PRIVACY.controller
// (src/config.ts) before launch. The review copy lives in legal/privacy-notice.md;
// keep the two in step.
import type { ReactNode } from "react";
import { APP, PRICING, PRIVACY, formatPrice } from "../config.ts";
import { services } from "../services/index.ts";
import { Button, Modal } from "./ui.tsx";

const H = ({ children }: { children: ReactNode }) => <h3>{children}</h3>;

export function PrivacyNotice({ onClose }: { onClose: () => void }) {
  const cloud = services.kind === "cloud";
  const c = PRIVACY.controller;
  return <Modal onClose={onClose} labelledBy="privacy-title">
    <div className="legal">
      <div className="eyebrow">Version {PRIVACY.version}</div>
      <h2 id="privacy-title" className="h2" style={{ margin: "4px 0 12px" }}>Privacy notice & terms</h2>
      <p className="legal__draft">Draft for review before launch.</p>

      <H>Who we are</H>
      <p>{APP.name} is run by <b>{c.name}</b> (NIF/NIE {c.taxId}), {c.address}. We are responsible for (the “controller” of) the personal data described here. Contact us any time at <b>{PRIVACY.contactEmail}</b>.</p>

      <H>Who this is for</H>
      <p>{APP.name} is a Spanish course for children, set up and managed by a parent or guardian aged 18 or over. Children don’t have their own accounts, logins or email addresses. In Spain, children under 14 can’t consent to the use of their data themselves, so we only work with a parent or guardian, who agrees on their behalf when signing up.</p>

      <H>What we keep</H>
      <ul>
        <li><b>About you (the grown-up):</b> your name, email address and password{cloud ? " (passwords are handled by Google Firebase Authentication; we never see them)" : " (stored scrambled on this device only)"}, and the date and version of this notice you agreed to.</li>
        <li><b>About each child:</b> only the first name or nickname you type, the animal picture you choose, and their learning progress (stars, words practised, streaks and badges).</li>
        <li>We do <b>not</b> collect children’s photos, voice recordings, location, contacts, school or date of birth.</li>
        <li><b>On your device:</b> the app saves your settings and a copy of your progress in the browser’s storage so it works offline. This is essential for the app to work; we don’t use cookies or anything else for tracking or advertising.</li>
      </ul>

      <H>Why we use it, and our legal basis</H>
      <ul>
        <li><b>To provide the course you signed up for</b>: your account, each child’s progress, syncing between devices, and service emails such as confirming your address or resetting your password. Legal basis: our contract with you (GDPR article 6.1.b). You choose to add each child as their parent or guardian.</li>
        <li><b>To keep the service safe and working</b>, for example blocking repeated wrong passwords. Legal basis: our legitimate interest in running a secure service (article 6.1.f).</li>
        <li>We do <b>not</b> use anyone’s data for advertising, profiling or selling, and we won’t send marketing emails unless you separately ask for them.</li>
      </ul>

      <H>The microphone</H>
      <p>The “Say it!” game uses your browser’s built-in speech recognition to check pronunciation. We never record or store your child’s voice. Some browsers (for example Chrome) send the audio to the browser maker (such as Google) to turn speech into text, under that company’s own privacy terms. You can skip this game at any time.</p>

      <H>Where it’s stored and who helps us</H>
      {cloud
        ? <ul>
            <li>Families’ data (children and progress) is stored in Google Cloud Firestore in <b>{PRIVACY.dataLocation}</b>, with a copy on each of your devices so lessons work offline.</li>
            <li>Logins (your email and password) are handled by Google Firebase Authentication, which may process them outside the EU, including in the United States.</li>
            <li>The app is delivered by our web host, Vercel, which handles technical details such as your IP address to send you the website and protect it from attacks, and may do so outside the EU.</li>
            <li>Google and Vercel act only on our instructions under data processing agreements. Where data leaves the EU, it is protected by the European Commission’s approved safeguards (the EU–US Data Privacy Framework and/or Standard Contractual Clauses).</li>
          </ul>
        : <p>Everything is stored on this device only. Clearing the browser’s data deletes it. The app is delivered by our web host, Vercel, which handles technical details such as your IP address to send you the website.</p>}

      <H>How long we keep it</H>
      <p>For as long as you have an account. When you delete your account (or a child’s profile), it is removed from our database straight away; any remaining copies in our providers’ backups are erased in line with their standard deletion periods. When paid plans start, we’ll keep billing records for as long as Spanish tax law requires.</p>

      <H>What we never do</H>
      <ul>
        <li>No adverts, no tracking, no selling or sharing data with anyone for their own purposes.</li>
        <li>No chat, messaging, public profiles or contact with strangers.</li>
        <li>No pushy notifications or tricks to keep children playing. Streaks and rewards are gentle and optional.</li>
        <li>Fonts, voices and pictures are served from the app itself, not third-party sites.</li>
      </ul>

      <H>Your rights</H>
      <ul>
        <li>You can ask to <b>see</b>, <b>correct</b>, <b>delete</b> or <b>restrict</b> the use of your family’s data, <b>object</b> to how we use it, or receive it in a portable format.</li>
        <li><b>Download</b> everything we hold and <b>delete</b> your account permanently, any time, from the grown-up dashboard.</li>
        <li>For anything else, email <b>{PRIVACY.contactEmail}</b>. It’s free, and we’ll reply within one month.</li>
        <li>If you’re unhappy with how we handle your data, you can complain to the {PRIVACY.authority.name}, {PRIVACY.authority.site}.</li>
      </ul>

      <H>Plans</H>
      <p>The first world is free. Full access costs {formatPrice(PRICING.plans[0].price)} a month or {formatPrice(PRICING.plans[1].price)} a year; you can cancel any time.</p>

      <H>Terms in short</H>
      <p>Please use {APP.name} for your own family’s learning, keep your password private, and be the grown-up in charge of your child’s use. We may update this notice; if anything important changes we’ll tell you and ask you to agree again.</p>
    </div>
    <Button variant="sun" block onClick={onClose} style={{ marginTop: 16 }}>Got it</Button>
  </Modal>;
}
