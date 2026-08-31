import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import BetaBanner from "@/components/beta/beta-banner";
import PwaRegistration from "@/components/pwa/pwa-registration";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  applicationName: "Boatly Ops",
  title: {
    default: "Boatly Ops",
    template: "%s | Boatly Ops",
  },
  description:
    "Gestisci calendario, prenotazioni, flotta, clienti e ricavi con Boatly Ops.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Boatly Ops",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#171A2B",
  viewportFit: "cover",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="it">
      <body className={`${geist.variable} antialiased`}>
        <BetaBanner />
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
