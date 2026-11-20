import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TerraPulse Agri Intelligence Platform",
    short_name: "TerraPulse",
    description:
      "Offline-capable agricultural land evaluation, geospatial water detection, FAO-56 irrigation modeling, PVGIS solar simulation, and AI decision support.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0c1a12",
    theme_color: "#14532d",
    categories: ["productivity", "utilities", "weather", "navigation"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
