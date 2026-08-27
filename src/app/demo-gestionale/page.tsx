import type { Metadata } from "next";

import DemoManagementApp from "@/components/demo/demo-management-app";

export const metadata: Metadata = {
  title: "Gestionale interattivo demo",
  description:
    "Prova il gestionale Boatly in un ambiente dimostrativo isolato, con dati sintetici modificabili.",
};

export default function ManagementDemoPage() {
  return <DemoManagementApp />;
}

