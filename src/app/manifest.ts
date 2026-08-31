import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Boatly Ops",
    short_name: "Boatly",
    description:
      "Calendario operativo e gestione della flotta per attività di noleggio nautico.",
    start_url: "/operator/calendar",
    scope: "/",
    display: "standalone",
    background_color: "#F7F6FB",
    theme_color: "#171A2B",
    orientation: "any",
    categories: ["business", "productivity"],
    lang: "it",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
