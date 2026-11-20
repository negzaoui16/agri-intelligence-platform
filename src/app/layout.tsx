import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraPulse Agri Intelligence — Field Land, Water & Solar Feasibility",
  description:
    "Mobile-first offline-capable agricultural decision-support platform integrating Open-Meteo, JRC PVGIS, OpenStreetMap, HydroSHEDS, Copernicus DEM, and FAO WaPOR v3.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TerraPulse",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#14532d" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1410" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
