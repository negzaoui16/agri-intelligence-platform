import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TerraPulse: your farm, water and sun power",
    short_name: "TerraPulse",
    description:
      "Check if your water and sun power are enough for your crops, find water near your farm, and get plain answers. Works without internet.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F6F4EE",
    theme_color: "#2E6B3A",
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
