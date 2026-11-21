"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Droplet, MapPin, Sprout, Sun, WifiOff } from "lucide-react";
import { LanguageSwitch, ThemeToggle } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { cn } from "@/lib/utils";

/*
 * Shared look for the sign-in screens, taken from the farmer screens (Home, Water, Report):
 * cream page, white cards with a soft border, round green buttons, 16–17px text.
 */
export const authLabel = "text-[16px] font-bold text-[var(--tp-fg-17251C)]";
export const authField =
  "w-full min-h-[52px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-4 text-[17px] text-[var(--tp-fg-17251C)] placeholder:text-[var(--tp-fg-4A5A4F)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tp-bd-2E6B3A)]";
export const authPrimaryButton =
  "w-full min-h-[56px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[17px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[var(--tp-bg-23542D)] disabled:opacity-60 disabled:pointer-events-none cursor-pointer";
export const authOutlineButton =
  "w-full min-h-[52px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[16px] font-bold text-[var(--tp-fg-17251C)] inline-flex items-center justify-center gap-2.5 hover:bg-[var(--tp-bg-F6F4EE)] disabled:opacity-60 cursor-pointer";
export const authLink =
  "min-h-[44px] inline-flex items-center font-bold text-[var(--tp-fg-1D4F91)] hover:underline underline-offset-2";
export const authEyeButton =
  "absolute end-1.5 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center rounded-full text-[var(--tp-fg-4A5A4F)] hover:text-[var(--tp-fg-17251C)] hover:bg-[var(--tp-bg-F6F4EE)] cursor-pointer";

/** Notice boxes in the farmer style: amber for problems, green for good news. */
export function AuthNotice({
  tone,
  children,
}: {
  tone: "problem" | "offline" | "good";
  children: React.ReactNode;
}) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "offline" ? WifiOff : AlertTriangle;
  return (
    <div
      role={tone === "problem" ? "alert" : "status"}
      className={cn(
        "rounded-[16px] px-4 py-3 text-[16px] leading-[1.45] flex items-start gap-2.5",
        tone === "good"
          ? "bg-[var(--tp-bg-E3EFE2)] border-[1.5px] border-[var(--tp-bd-7FB083)] text-[var(--tp-fg-1F4D28)]"
          : "bg-[var(--tp-bg-FCEFD9)] border-2 border-[var(--tp-bd-E2B66B)] text-[var(--tp-fg-6B3A00)] font-bold"
      )}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** Google "G" logo in its brand colours (required by Google's sign-in branding rules). */
export function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

/** "or use your email" line between the Google button and the form. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[15px] text-[var(--tp-fg-4A5A4F)]">
      <span className="flex-1 border-t-[1.5px] border-[var(--tp-bd-E4DFD2)]" />
      <span>{label}</span>
      <span className="flex-1 border-t-[1.5px] border-[var(--tp-bd-E4DFD2)]" />
    </div>
  );
}

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Shown under the card ("New here? Create an account"). */
  footer?: React.ReactNode;
}) {
  const { lang } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const features = [
    { Icon: MapPin, title: s.panelMapTitle, text: s.panelMapText },
    { Icon: Droplet, title: s.panelWaterTitle, text: s.panelWaterText },
    { Icon: Sun, title: s.panelSunTitle, text: s.panelSunText },
    { Icon: WifiOff, title: s.panelOfflineTitle, text: s.panelOfflineText },
  ];

  return (
    <div className="min-h-screen bg-[var(--tp-bg-F6F4EE)] text-[var(--tp-fg-17251C)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Sign-in column */}
      <div className="flex flex-col px-4 py-5 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/login" className="inline-flex items-center gap-3 min-w-0 no-underline">
            <span className="w-10 h-10 rounded-[12px] bg-[var(--tp-bg-2E6B3A)] text-white flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex flex-col">
              <b className="text-[18px] leading-tight text-[var(--tp-fg-17251C)]">TerraPulse</b>
              <span className="hidden min-[420px]:block text-[14px] text-[var(--tp-fg-4A5A4F)] truncate">{s.appTagline}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
            <LanguageSwitch />
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center py-8">
          <div className="w-full max-w-[460px] mx-auto flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 px-1">
              <h1 className="m-0 text-[30px] lg:text-[34px] font-bold leading-[1.15]">{title}</h1>
              <p className="m-0 text-[17px] leading-[1.45] text-[var(--tp-fg-4A5A4F)]">{subtitle}</p>
            </div>

            <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 sm:p-6 flex flex-col gap-4">
              {children}
            </section>

            {footer && (
              <div className="flex flex-col items-center gap-1 text-[16px] text-[var(--tp-fg-4A5A4F)] text-center">
                {footer}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Desktop side panel: dark ink block like the Report verdict, plain words */}
      <aside className="hidden lg:flex m-4 ms-0 rounded-[24px] bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] p-12 flex-col justify-center gap-8">
        <div className="flex flex-col gap-4 max-w-[520px]">
          <span className="self-start min-h-[34px] px-3.5 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[14px] font-bold inline-flex items-center">
            {s.panelBadge}
          </span>
          <h2 className="m-0 text-[32px] font-bold leading-[1.2]">{s.panelTitle}</h2>
          <p className="m-0 text-[18px] leading-[1.5] text-[var(--tp-fg-D5DDD7)]">{s.panelBody}</p>
        </div>

        <ul className="m-0 p-0 list-none grid grid-cols-2 gap-3 max-w-[560px]">
          {features.map(({ Icon, title: featureTitle, text }) => (
            <li
              key={featureTitle}
              className="rounded-[18px] border-[1.5px] border-white/15 bg-white/5 p-4 flex flex-col gap-1.5"
            >
              <Icon className="w-6 h-6 text-[#86CF95]" aria-hidden="true" />
              <b className="text-[17px]">{featureTitle}</b>
              <span className="text-[15px] leading-[1.4] text-[var(--tp-fg-D5DDD7)]">{text}</span>
            </li>
          ))}
        </ul>

        <p className="m-0 max-w-[520px] text-[15px] leading-[1.45] text-[var(--tp-fg-D5DDD7)]">{s.panelFootnote}</p>
      </aside>
    </div>
  );
}
