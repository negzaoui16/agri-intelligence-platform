import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Noto_Sans_Arabic } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-latin",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arabic",
  display: "swap",
});

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
  themeColor: [{ color: "#2E6B3A" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen bg-[#F6F4EE] text-[#17251C]">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
