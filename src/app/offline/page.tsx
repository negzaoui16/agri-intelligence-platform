"use client";

import Link from "next/link";
import { CloudOff, Droplet, MapPin, Tractor } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useFarms } from "@/hooks/useFarms";
import { fillTemplate } from "@/lib/i18n/farm-ui-strings";
import { SCREEN_STRINGS } from "@/lib/i18n/screen-strings";
import { cn } from "@/lib/utils";

const outlineLink =
  "min-h-[48px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[16px] font-bold text-[var(--tp-fg-17251C)] inline-flex items-center gap-2 hover:bg-[var(--tp-bg-F6F4EE)]";

export default function OfflinePage() {
  const { lang, t } = useLanguage();
  const s = SCREEN_STRINGS[lang];
  const { farms } = useFarms();

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 py-6">
      <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-4">
        <span className="self-start min-h-[36px] px-3.5 rounded-full bg-[var(--tp-bg-FCEFD9)] text-[var(--tp-fg-8A4B00)] text-[15px] font-bold inline-flex items-center gap-2">
          <CloudOff className="w-4 h-4" aria-hidden="true" />
          {s.offlineBadge}
        </span>
        <h1 className="m-0 text-[26px] lg:text-[30px] font-bold text-[var(--tp-fg-17251C)] leading-tight">
          {s.offlineTitle}
        </h1>
        <p className="m-0 text-[17px] leading-[1.5] text-[var(--tp-fg-4A5A4F)]">{s.offlineBody}</p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/"
            className="min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[16px] font-bold inline-flex items-center hover:bg-[var(--tp-bg-23542D)]"
          >
            {s.openMyFarm}
          </Link>
          <Link href="/farms" className={outlineLink}>
            <Tractor className="w-5 h-5" aria-hidden="true" />
            {s.myFarms}
          </Link>
          <Link href="/water" className={outlineLink}>
            <Droplet className="w-5 h-5" aria-hidden="true" />
            {s.water}
          </Link>
        </div>
      </section>

      <section className="bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-5 lg:p-6 flex flex-col gap-3">
        <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)]">
          {fillTemplate(s.savedFarms, { count: farms.length })}
        </h2>
        {farms.length === 0 ? (
          <p className="m-0 text-[16px] text-[var(--tp-fg-4A5A4F)]">{s.noSavedFarms}</p>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {farms.map((farm) => (
              <li
                key={farm.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-[14px] border-[1.5px] border-[var(--tp-bd-EFEBE1)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-5 h-5 shrink-0 text-[var(--tp-fg-2E6B3A)]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p dir="auto" className="m-0 text-[16px] font-bold text-[var(--tp-fg-17251C)] truncate text-start rtl:text-right">
                      {farm.name}
                    </p>
                    <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">
                      {Number(farm.areaHectares.toFixed(1))} {t.hectaresFull}
                    </p>
                  </div>
                </div>
                <Link href="/reports" className={cn(outlineLink, "min-h-[44px] px-4 text-[15px] shrink-0")}>
                  {s.report}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
