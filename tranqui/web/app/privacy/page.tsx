import Link from "next/link";
import { Logo } from "@/components/Logo";
import { catalog } from "@/lib/catalog";

export const metadata = { title: "Privacy | Tranqui" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-mist">
      <Link href="/"><Logo className="text-sand" /></Link>
      <h1 className="mt-12 font-display text-5xl font-extrabold text-sand">Privacy notice</h1>
      <p className="mt-2 text-sm">Template. Have it reviewed by a UK/Spanish data-protection adviser before launch.</p>
      <div className="mt-10 space-y-6 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-sand">
        <h2>Who we are</h2>
        <p>{catalog.brand.legalName} ("Tranqui") is the controller for prospect and marketing data, and the processor for data we handle on behalf of customers under our Data Processing Agreement. Contact: {catalog.brand.contact.email}.</p>
        <h2>Business contact data we collect for outreach (UK GDPR Art. 14)</h2>
        <p>We collect publicly available business information (company name, website, published business email and phone, Companies House records and public DNS records) to offer IT services to businesses. Lawful basis: legitimate interests. We only email limited companies and LLPs without prior consent; we never cold-email sole traders, partnerships, or businesses in Spain. You can object at any time by replying "no thanks" or using the unsubscribe link, and we will suppress your details permanently.</p>
        <h2>AI processing</h2>
        <p>Our helpdesk and sales assistants are AI systems. Messages you send are processed by our AI provider to generate replies. We do not use your data to train models. A human can review any conversation and you can ask for a person at any time.</p>
        <h2>Retention</h2>
        <p>Prospect data: up to 12 months without engagement, then deleted. Support tickets: life of contract + 6 years (UK) / as required by Spanish law. Suppression list: kept indefinitely so we never contact you again.</p>
        <h2>Your rights</h2>
        <p>Access, rectification, erasure, restriction, objection and portability. Complain to the ICO (UK) or AEPD (Spain).</p>
      </div>
    </main>
  );
}
