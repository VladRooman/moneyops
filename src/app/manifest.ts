import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyOps",
    short_name: "MoneyOps",
    description: "Buget personal PWA pentru controlul cheltuielilor lunare.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060b10",
    theme_color: "#060b10",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
