"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, MinusCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { FarmerStatusLevel } from "@/lib/services/farmer-metrics";
import { cn } from "@/lib/utils";

export function FarmerPageHeader({
  mobileLabel,
  title,
  subtitle,
  backHref = "/",
  rightAction,
}: {
  mobileLabel: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  rightAction?: React.ReactNode;
}) {
  const { isRtl, t } = useLanguage();

  return (
    <header className="flex flex-col gap-3">
      {/* Mobile circular back button bar */}
      <div className="flex lg:hidden items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            aria-label={t.backToHome}
            className="w-11 h-11 rounded-full bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] flex items-center justify-center shrink-0 text-[var(--tp-fg-17251C)]"
          >
            <ArrowLeft
              className={cn("w-[22px] h-[22px]", isRtl && "rotate-180")}
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </Link>
          <div className="min-w-0">
            <span className="text-[17px] font-bold text-[var(--tp-fg-17251C)] block truncate">
              {mobileLabel}
            </span>
            {subtitle && (
              <span className="text-[14px] text-[var(--tp-fg-4A5A4F)] block truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>

      {/* Desktop Back Link + Page Question Headline */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Link
            href={backHref}
            className="hidden lg:inline-flex items-center gap-1.5 text-[16px] font-bold text-[var(--tp-fg-1D4F91)] hover:text-[var(--tp-fg-123766)] w-fit min-h-[44px]"
          >
            <ArrowLeft
              className={cn("w-4 h-4", isRtl && "rotate-180")}
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span>{t.backToHome}</span>
          </Link>
          <h1 className="m-0 text-[26px] lg:text-[34px] font-bold leading-[1.2] text-[var(--tp-fg-17251C)]">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden lg:block m-0 text-[18px] text-[var(--tp-fg-4A5A4F)] leading-[1.45]">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && <div className="hidden lg:flex flex-wrap gap-2.5">{rightAction}</div>}
      </div>
    </header>
  );
}

const LANGUAGE_CHOICES = [
  { code: "en", short: "EN", name: "English" },
  { code: "ar", short: "ع", name: "العربية" },
  { code: "fr", short: "FR", name: "Français" },
] as const;

/** Compact EN · ع · FR switch with 40px tap targets (phone headers and sign-in screens). */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t.changeLanguageLabel}
      className={cn(
        "min-h-[44px] px-1 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] inline-flex items-center gap-0.5 text-[15px] font-bold text-[var(--tp-fg-17251C)] shrink-0",
        className
      )}
    >
      {LANGUAGE_CHOICES.map((choice) => (
        <button
          key={choice.code}
          type="button"
          lang={choice.code}
          onClick={() => setLang(choice.code)}
          aria-pressed={lang === choice.code}
          aria-label={choice.name}
          title={choice.name}
          className={cn(
            "min-h-[40px] min-w-[40px] px-2 rounded-full",
            lang === choice.code
              ? "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)]"
              : "text-[var(--tp-fg-4A5A4F)] hover:text-[var(--tp-fg-17251C)]"
          )}
        >
          {choice.short}
        </button>
      ))}
    </div>
  );
}

/**
 * Light / dark mode switch. `compact` is a 44px round icon button (phone headers);
 * the default shows the icon plus the mode it switches to (desktop sidebar).
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Theme is only known in the browser; render a stable placeholder first to avoid a hydration mismatch.
  const isDark = mounted && resolvedTheme === "dark";
  const nextLabel = isDark ? t.themeLight : t.themeDark;
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t.themeSwitchLabel}
      aria-pressed={isDark}
      title={nextLabel}
      className={cn(
        "shrink-0 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] inline-flex items-center justify-center gap-2 font-bold hover:bg-[var(--tp-bg-F6F4EE)] transition-colors",
        compact ? "w-11 h-11" : "min-h-[44px] w-full px-4 text-[15px]"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      {!compact && <span>{nextLabel}</span>}
    </button>
  );
}

export function FarmerStatusBadge({
  level,
  label,
}: {
  level: FarmerStatusLevel;
  label?: string;
}) {
  const { t } = useLanguage();
  const resolvedLabel =
    label ??
    (level === "GOOD" ? t.statusGood : level === "OK" ? t.statusOk : t.statusProblem);

  if (level === "GOOD") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--tp-fg-2E6B3A)]">
        <CheckCircle2 className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
        <span>{resolvedLabel}</span>
      </span>
    );
  }
  if (level === "PROBLEM") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--tp-fg-8A4B00)]">
        <AlertTriangle className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
        <span>{resolvedLabel}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--tp-fg-5B4A2A)]">
      <MinusCircle className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
      <span>{resolvedLabel}</span>
    </span>
  );
}
