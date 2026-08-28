import type { Metadata } from "next";

import DemoManagementApp from "@/components/demo/demo-management-app";

export const metadata: Metadata = {
  title: "Boatly Ops — area noleggiatore",
  description:
    "Area operativa Boatly per calendario, prenotazioni, flotta, clienti e controllo economico.",
};

export default function ManagementDemoPage() {
  return <DemoManagementApp />;
}
