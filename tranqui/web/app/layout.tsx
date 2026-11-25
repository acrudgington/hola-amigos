import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "./globals.css";
import { RegionProvider } from "@/components/RegionProvider";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Tranqui | IT support, sorted. UK & Costa Blanca",
  description:
    "British-run IT support for small businesses in the UK and on the Costa Blanca. 24/7 AI helpdesk on WhatsApp, automated security and patching, real engineers when you need them.",
  metadataBase: new URL("https://tranqui.tech"),
  openGraph: { title: "Tranqui: IT, sorted. Now relax.", description: "24/7 AI-powered IT support for small businesses in the UK & Costa Blanca.", type: "website" },
  alternates: { languages: { "en-GB": "/", "es-ES": "/es" } },
};
export const viewport: Viewport = { themeColor: "#070b1f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="grain">
        <RegionProvider>
          <SmoothScroll />
          {children}
        </RegionProvider>
      </body>
    </html>
  );
}
