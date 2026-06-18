import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Saira_Condensed } from "next/font/google";
import { DevServiceWorkerCleanup } from "@/components/layout/DevServiceWorkerCleanup";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import "@/styles/globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display"
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans"
});

const jersey = Saira_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-jersey"
});

export const metadata: Metadata = {
  title: "Dono da Pelada",
  description: "Controle jogadores, peladas, gols e sorteie times balanceados.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.png"
  },
  appleWebApp: {
    capable: true,
    title: "Pelada",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${sans.variable} ${jersey.variable}`}>
        <DevServiceWorkerCleanup />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
