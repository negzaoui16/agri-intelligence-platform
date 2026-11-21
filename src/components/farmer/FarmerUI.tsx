"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, MinusCircle } from "lucide-react";
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
            className="w-11 h-11 rounded-full bg-white border-[1.5px] border-[#E4DFD2] flex items-center justify-center shrink-0 text-[#17251C]"
          >
            <ArrowLeft
              className={cn("w-[22px] h-[22px]", isRtl && "rotate-180")}
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </Link>
          <div className="min-w-0">
            <span className="text-[17px] font-bold text-[#17251C] block truncate">
              {mobileLabel}
            </span>
            {subtitle && (
              <span className="text-[14px] text-[#4A5A4F] block truncate">
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
            className="hidden lg:inline-flex items-center gap-1.5 text-[16px] font-bold text-[#1D4F91] hover:text-[#123766] w-fit min-h-[44px]"
          >
            <ArrowLeft
              className={cn("w-4 h-4", isRtl && "rotate-180")}
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span>{t.backToHome}</span>
          </Link>
          <h1 className="m-0 text-[26px] lg:text-[34px] font-bold leading-[1.2] text-[#17251C]">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden lg:block m-0 text-[18px] text-[#4A5A4F] leading-[1.45]">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && <div className="hidden lg:flex flex-wrap gap-2.5">{rightAction}</div>}
      </div>
    </header>
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
      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#2E6B3A]">
        <CheckCircle2 className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
        <span>{resolvedLabel}</span>
      </span>
    );
  }
  if (level === "PROBLEM") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#8A4B00]">
        <AlertTriangle className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
        <span>{resolvedLabel}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#5B4A2A]">
      <MinusCircle className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
      <span>{resolvedLabel}</span>
    </span>
  );
}
