"use client";

import * as React from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export type AccessibilityTextScale = "normal" | "large" | "xlarge";
export type AccessibilityColorFilter =
  | "none"
  | "grayscale"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";
export type AccessibilitySpeechRate = 0.85 | 1 | 1.15;

export interface AccessibilitySettings {
  textScale: AccessibilityTextScale;
  boldText: boolean;
  highContrast: boolean;
  buttonShapes: boolean;
  reduceMotion: boolean;
  largeTargets: boolean;
  colorFilter: AccessibilityColorFilter;
  speechRate: AccessibilitySpeechRate;
}

export const ACCESSIBILITY_STORAGE_KEY = "terrapulse_a11y_v1";

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScale: "normal",
  boldText: false,
  highContrast: false,
  buttonShapes: false,
  reduceMotion: false,
  largeTargets: false,
  colorFilter: "none",
  speechRate: 1,
};

const VALID_TEXT_SCALES = new Set<AccessibilityTextScale>(["normal", "large", "xlarge"]);
const VALID_COLOR_FILTERS = new Set<AccessibilityColorFilter>([
  "none",
  "grayscale",
  "protanopia",
  "deuteranopia",
  "tritanopia",
]);
const VALID_SPEECH_RATES = new Set<AccessibilitySpeechRate>([0.85, 1, 1.15]);

export function parseAccessibilitySettings(raw: string | null): AccessibilitySettings {
  if (!raw) return DEFAULT_ACCESSIBILITY_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings> | null;
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }
    return {
      textScale: VALID_TEXT_SCALES.has(parsed.textScale as AccessibilityTextScale)
        ? (parsed.textScale as AccessibilityTextScale)
        : DEFAULT_ACCESSIBILITY_SETTINGS.textScale,
      boldText:
        typeof parsed.boldText === "boolean"
          ? parsed.boldText
          : DEFAULT_ACCESSIBILITY_SETTINGS.boldText,
      highContrast:
        typeof parsed.highContrast === "boolean"
          ? parsed.highContrast
          : DEFAULT_ACCESSIBILITY_SETTINGS.highContrast,
      buttonShapes:
        typeof parsed.buttonShapes === "boolean"
          ? parsed.buttonShapes
          : DEFAULT_ACCESSIBILITY_SETTINGS.buttonShapes,
      reduceMotion:
        typeof parsed.reduceMotion === "boolean"
          ? parsed.reduceMotion
          : DEFAULT_ACCESSIBILITY_SETTINGS.reduceMotion,
      largeTargets:
        typeof parsed.largeTargets === "boolean"
          ? parsed.largeTargets
          : DEFAULT_ACCESSIBILITY_SETTINGS.largeTargets,
      colorFilter: VALID_COLOR_FILTERS.has(parsed.colorFilter as AccessibilityColorFilter)
        ? (parsed.colorFilter as AccessibilityColorFilter)
        : DEFAULT_ACCESSIBILITY_SETTINGS.colorFilter,
      speechRate: VALID_SPEECH_RATES.has(parsed.speechRate as AccessibilitySpeechRate)
        ? (parsed.speechRate as AccessibilitySpeechRate)
        : DEFAULT_ACCESSIBILITY_SETTINGS.speechRate,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

export interface AttributeTarget {
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
}

export function applyAccessibilityAttributes(
  root: AttributeTarget,
  settings: AccessibilitySettings
): void {
  if (settings.textScale === "normal") {
    root.removeAttribute("data-a11y-text");
  } else {
    root.setAttribute("data-a11y-text", settings.textScale);
  }

  if (settings.boldText) {
    root.setAttribute("data-a11y-bold", "true");
  } else {
    root.removeAttribute("data-a11y-bold");
  }

  if (settings.highContrast) {
    root.setAttribute("data-a11y-contrast", "true");
  } else {
    root.removeAttribute("data-a11y-contrast");
  }

  if (settings.buttonShapes) {
    root.setAttribute("data-a11y-shapes", "true");
  } else {
    root.removeAttribute("data-a11y-shapes");
  }

  if (settings.reduceMotion) {
    root.setAttribute("data-a11y-motion", "reduce");
  } else {
    root.removeAttribute("data-a11y-motion");
  }

  if (settings.largeTargets) {
    root.setAttribute("data-a11y-targets", "true");
  } else {
    root.removeAttribute("data-a11y-targets");
  }

  if (settings.colorFilter === "none") {
    root.removeAttribute("data-a11y-filter");
  } else {
    root.setAttribute("data-a11y-filter", settings.colorFilter);
  }
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  toggleSheet: () => void;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
  isSpeaking: boolean;
  speakScreen: () => boolean;
  stopSpeaking: () => void;
  activeCount: number;
}

const AccessibilityContext = React.createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [settings, setSettings] = React.useState<AccessibilitySettings>(
    DEFAULT_ACCESSIBILITY_SETTINGS
  );
  const [hydrated, setHydrated] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);

  // Hydrate persisted accessibility settings cleanly after mount (zero SSR hydration mismatch).
  React.useEffect(() => {
    try {
      const saved = parseAccessibilitySettings(
        window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
      );
      setSettings(saved);
    } catch {
      // ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    applyAccessibilityAttributes(document.documentElement, settings);
    if (hydrated) {
      try {
        window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // ignore storage quota / private mode
      }
    }
  }, [settings, hydrated]);

  const stopSpeaking = React.useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Global iPhone-like quick Accessibility Shortcut: Alt + A
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const speakScreen = React.useCallback((): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }
    const container =
      document.querySelector("#main-content") ?? document.querySelector("main") ?? document.body;
    const rawText = (container?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!rawText) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(rawText.slice(0, 1800));
    utterance.lang =
      lang === "ar"
        ? "ar-TN"
        : lang === "fr"
          ? "fr-FR"
          : lang === "ja"
            ? "ja-JP"
            : "en-US";
    utterance.rate = settings.speechRate;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }, [lang, settings.speechRate]);

  const updateSetting = React.useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetSettings = React.useCallback(() => {
    stopSpeaking();
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  }, [stopSpeaking]);

  const activeCount = React.useMemo(() => {
    let count = 0;
    if (settings.textScale !== "normal") count++;
    if (settings.boldText) count++;
    if (settings.highContrast) count++;
    if (settings.buttonShapes) count++;
    if (settings.reduceMotion) count++;
    if (settings.largeTargets) count++;
    if (settings.colorFilter !== "none") count++;
    return count;
  }, [settings]);

  const openSheet = React.useCallback(() => setIsOpen(true), []);
  const closeSheet = React.useCallback(() => setIsOpen(false), []);
  const toggleSheet = React.useCallback(() => setIsOpen((prev) => !prev), []);

  const value = React.useMemo<AccessibilityContextValue>(
    () => ({
      settings,
      isOpen,
      openSheet,
      closeSheet,
      toggleSheet,
      updateSetting,
      resetSettings,
      isSpeaking,
      speakScreen,
      stopSpeaking,
      activeCount,
    }),
    [
      settings,
      isOpen,
      openSheet,
      closeSheet,
      toggleSheet,
      updateSetting,
      resetSettings,
      isSpeaking,
      speakScreen,
      stopSpeaking,
      activeCount,
    ]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = React.useContext(AccessibilityContext);
  if (!ctx) {
    return {
      settings: DEFAULT_ACCESSIBILITY_SETTINGS,
      isOpen: false,
      openSheet: () => undefined,
      closeSheet: () => undefined,
      toggleSheet: () => undefined,
      updateSetting: () => undefined,
      resetSettings: () => undefined,
      isSpeaking: false,
      speakScreen: () => false,
      stopSpeaking: () => undefined,
      activeCount: 0,
    };
  }
  return ctx;
}
