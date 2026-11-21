"use client";

import * as React from "react";
import {
  formatTemplate,
  localizeCropLabel,
  localizeMonthName,
  TRANSLATIONS,
  type AppLanguage,
  type TranslationStrings,
} from "@/lib/i18n/translations";

interface LanguageContextValue {
  lang: AppLanguage;
  isRtl: boolean;
  setLang: (next: AppLanguage) => void;
  cycleLang: () => void;
  t: TranslationStrings;
  fmt: (template: string, vars: Record<string, string | number>) => string;
  monthLabel: (monthName: string) => string;
  cropLabel: (cropName: string, cropCode: string) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "terrapulse_lang";

function saveLang(lang: AppLanguage) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore storage unavailable
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<AppLanguage>("en");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
      if (saved === "en" || saved === "fr" || saved === "ar") {
        setLangState(saved);
      }
    } catch {
      // ignore storage unavailable
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // Saved only when the farmer picks a language, so the "en" default on first render
  // can never overwrite their stored choice.
  const setLang = React.useCallback((next: AppLanguage) => {
    setLangState(next);
    saveLang(next);
  }, []);

  const cycleLang = React.useCallback(() => {
    const next: AppLanguage = lang === "en" ? "ar" : lang === "ar" ? "fr" : "en";
    setLangState(next);
    saveLang(next);
  }, [lang]);

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      lang,
      isRtl: lang === "ar",
      setLang,
      cycleLang,
      t: TRANSLATIONS[lang],
      fmt: formatTemplate,
      monthLabel: (m: string) => localizeMonthName(m, lang),
      cropLabel: (name: string, code: string) => localizeCropLabel(name, code, lang),
    }),
    [lang, setLang, cycleLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: "en",
      isRtl: false,
      setLang: () => undefined,
      cycleLang: () => undefined,
      t: TRANSLATIONS.en,
      fmt: formatTemplate,
      monthLabel: (m) => m,
      cropLabel: (n) => n,
    };
  }
  return ctx;
}
