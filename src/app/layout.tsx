import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import BetaBanner from "@/components/beta/beta-banner";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Boatly",
    template: "%s | Boatly",
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
      </body>
    </html>
  );
}
