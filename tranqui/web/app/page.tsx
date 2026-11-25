import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Marquee, HowItWorks, Services, Regions, Faq } from "@/components/Sections";
import { Pricing } from "@/components/Pricing";
import { HealthCheck } from "@/components/HealthCheck";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Services />
      <Regions />
      <Pricing />
      <HealthCheck />
      <Faq />
      <Footer />
      <ChatWidget />
    </main>
  );
}
