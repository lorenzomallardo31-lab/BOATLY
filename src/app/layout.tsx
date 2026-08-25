import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

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
    "Trova, prenota e gestisci noleggi di barche con Boatly.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="it">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}