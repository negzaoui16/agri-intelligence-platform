"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { LanguageSwitch, ThemeToggle } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { Compass, Droplets, Satellite, Sprout, Sun } from "lucide-react";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const features = [
    { Icon: Compass, color: "text-emerald-400", title: s.panelMapTitle, text: s.panelMapText },
    { Icon: Droplets, color: "text-sky-400", title: s.panelWaterTitle, text: s.panelWaterText },
    { Icon: Sun, color: "text-amber-400", title: s.panelSunTitle, text: s.panelSunText },
    { Icon: Satellite, color: "text-emerald-300", title: s.panelOfflineTitle, text: s.panelOfflineText },
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background text-foreground">
      {/* Sign-in form */}
      <div className="lg:col-span-6 flex flex-col justify-center px-4 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/login" className="inline-flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[var(--tp-bg-14532D)] text-white flex items-center justify-center shrink-0">
                <Sprout className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[17px] tracking-tight">TerraPulse</p>
                <p className="text-[14px] text-muted-foreground">{s.appTagline}</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle compact />
              <LanguageSwitch />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-[28px] font-bold tracking-tight leading-tight">{title}</h1>
            <p className="text-[16px] text-muted-foreground leading-[1.45]">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>

      {/* Desktop side panel: what the app does, in plain words */}
      <div className="hidden lg:flex lg:col-span-6 bg-[var(--tp-bg-0F291E)] text-emerald-50 p-12 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(#4ade80 1px, transparent 1px), radial-gradient(#0ea5e9 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            backgroundPosition: "0 0, 18px 18px",
          }}
        />

        <div className="relative z-10">
          <Badge variant="green" className="bg-emerald-900/80 text-emerald-200 border-emerald-700 text-[14px]">
            {s.panelBadge}
          </Badge>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-3xl font-bold leading-tight text-white">{s.panelTitle}</h2>
          <p className="text-[17px] text-emerald-100/90 leading-relaxed">{s.panelBody}</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {features.map(({ Icon, color, title: featureTitle, text }) => (
              <div key={featureTitle} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                <p className="text-[15px] font-semibold text-white">{featureTitle}</p>
                <p className="text-[14px] text-emerald-100/85 leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[14px] text-emerald-100/80 leading-snug">{s.panelFootnote}</p>
      </div>
    </div>
  );
}
