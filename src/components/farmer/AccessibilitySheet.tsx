"use client";

import * as React from "react";
import {
  Accessibility,
  Bold,
  Contrast,
  Eye,
  Hand,
  RotateCcw,
  Sparkles,
  Square,
  Type,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  useAccessibility,
  type AccessibilityColorFilter,
  type AccessibilitySpeechRate,
  type AccessibilityTextScale,
} from "@/components/providers/AccessibilityProvider";
import { ACCESSIBILITY_STRINGS } from "@/lib/i18n/accessibility-strings";
import { cn } from "@/lib/utils";

function IosSwitchRow({
  icon: Icon,
  iconBg,
  label,
  description,
  checked,
  onToggle,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex items-start gap-3 min-w-0">
        <span
          className={cn(
            "w-8 h-8 rounded-[9px] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs",
            iconBg
          )}
          aria-hidden="true"
        >
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0">
          <span className="block text-[15px] font-bold text-[var(--tp-fg-17251C)] leading-snug">
            {label}
          </span>
          <span className="block text-[12.5px] text-[var(--tp-fg-4A5A4F)] leading-snug">
            {description}
          </span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
        onClick={onToggle}
        className={cn(
          "relative w-[52px] h-[31px] rounded-full transition-colors duration-200 shrink-0 p-[2.5px] flex items-center",
          checked ? "bg-[#34C759]" : "bg-[var(--tp-bd-C9C3B3)]"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "w-[26px] h-[26px] rounded-full bg-white shadow-md transition-transform duration-200",
            checked ? "translate-x-[21px] rtl:-translate-x-[21px]" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export function AccessibilitySheet() {
  const { lang, isRtl } = useLanguage();
  const str = ACCESSIBILITY_STRINGS[lang];
  const {
    settings,
    isOpen,
    closeSheet,
    updateSetting,
    resetSettings,
    isSpeaking,
    speakScreen,
    stopSpeaking,
  } = useAccessibility();

  const [statusMsg, setStatusMsg] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeSheet]);

  const textOptions: Array<{ value: AccessibilityTextScale; label: string }> = [
    { value: "normal", label: str.textNormal },
    { value: "large", label: str.textLarge },
    { value: "xlarge", label: str.textXLarge },
  ];

  const colorFilters: Array<{ value: AccessibilityColorFilter; label: string }> = [
    { value: "none", label: str.filterNone },
    { value: "grayscale", label: str.filterGrayscale },
    { value: "protanopia", label: str.filterProtanopia },
    { value: "deuteranopia", label: str.filterDeuteranopia },
    { value: "tritanopia", label: str.filterTritanopia },
  ];

  const speechRates: AccessibilitySpeechRate[] = [0.85, 1, 1.15];

  const handleSpeakToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      setStatusMsg("");
      return;
    }
    const ok = speakScreen();
    setStatusMsg(ok ? str.speakingStatus : str.speechUnavailable);
  };

  const handleReset = () => {
    resetSettings();
    setStatusMsg(str.resetDoneStatus);
  };

  return (
    <>
      {/* Hidden SVG Color Blindness Simulation/Correction Matrices */}
      <svg aria-hidden="true" className="fixed w-0 h-0 pointer-events-none opacity-0 overflow-hidden">
        <defs>
          <filter id="tp-filter-protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="tp-filter-deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="tp-filter-tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-[2px]"
          onClick={closeSheet}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tp-a11y-sheet-title"
            data-testid="accessibility-dialog"
            dir={isRtl ? "rtl" : "ltr"}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[460px] max-h-[88vh] flex flex-col rounded-t-[26px] sm:rounded-[26px] bg-[var(--tp-bg-F6F4EE)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] shadow-2xl overflow-hidden"
          >
            {/* Header matching iOS Settings modal sheet */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 bg-[var(--tp-bg-FFFFFF)] border-b border-[var(--tp-bd-E4DFD2)] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-10 h-10 rounded-[12px] bg-[#007AFF] text-white flex items-center justify-center shrink-0 shadow-xs"
                  aria-hidden="true"
                >
                  <Accessibility className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="tp-a11y-sheet-title"
                    className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)] leading-tight"
                  >
                    {str.modalTitle}
                  </h2>
                  <p className="m-0 text-[12px] text-[var(--tp-fg-4A5A4F)] truncate">
                    {str.shortcutHint}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="close-accessibility-btn"
                onClick={closeSheet}
                aria-label={str.closeLabel}
                className="min-h-[38px] px-3.5 rounded-full bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] text-[14px] font-bold inline-flex items-center gap-1 hover:opacity-90 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                <span>{str.closeLabel}</span>
              </button>
            </div>

            {/* Scrollable iOS grouped sections */}
            <div className="overflow-y-auto px-4 py-4 flex flex-col gap-5">
              <p className="m-0 text-[13.5px] text-[var(--tp-fg-4A5A4F)] px-1 leading-snug">
                {str.modalSubtitle}
              </p>

              {/* Section 1: Display & Text Size */}
              <section className="flex flex-col gap-2">
                <h3 className="m-0 px-2 text-[12px] font-bold uppercase tracking-wider text-[var(--tp-fg-4A5A4F)]">
                  {str.sectionDisplay}
                </h3>
                <div className="rounded-[18px] bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] divide-y divide-[var(--tp-bd-E4DFD2)] overflow-hidden">
                  {/* Dynamic Type Segmented Control */}
                  <div className="px-4 py-3.5 flex flex-col gap-2.5">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-8 h-8 rounded-[9px] bg-[#007AFF] text-white flex items-center justify-center shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        <Type className="w-[18px] h-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                          {str.largerTextLabel}
                        </span>
                        <span className="block text-[12.5px] text-[var(--tp-fg-4A5A4F)] leading-snug">
                          {str.largerTextDesc}
                        </span>
                      </div>
                    </div>

                    <div
                      role="group"
                      aria-label={str.largerTextLabel}
                      className="grid grid-cols-3 gap-1.5 rounded-[12px] bg-[var(--tp-bg-F6F4EE)] p-1 border border-[var(--tp-bd-E4DFD2)]"
                    >
                      {textOptions.map((opt) => {
                        const active = settings.textScale === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            data-testid={`a11y-text-${opt.value}`}
                            aria-pressed={active}
                            onClick={() => updateSetting("textScale", opt.value)}
                            className={cn(
                              "min-h-[38px] px-2 rounded-[9px] text-[12.5px] font-bold transition-colors",
                              active
                                ? "bg-[var(--tp-bg-2E6B3A)] text-white shadow-xs"
                                : "text-[var(--tp-fg-17251C)] hover:bg-[var(--tp-bg-FFFFFF)]"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <p
                      className={cn(
                        "m-0 rounded-[10px] bg-[var(--tp-bg-F6F4EE)] px-3 py-2 text-[var(--tp-fg-17251C)] border border-[var(--tp-bd-E4DFD2)] leading-snug",
                        settings.textScale === "xlarge"
                          ? "text-[17px]"
                          : settings.textScale === "large"
                            ? "text-[15.5px]"
                            : "text-[13.5px]",
                        settings.boldText && "font-bold"
                      )}
                    >
                      {str.textPreviewSample}
                    </p>
                  </div>

                  <IosSwitchRow
                    icon={Bold}
                    iconBg="bg-[#5856D6]"
                    label={str.boldTextLabel}
                    description={str.boldTextDesc}
                    checked={settings.boldText}
                    onToggle={() => updateSetting("boldText", !settings.boldText)}
                    testId="a11y-toggle-bold"
                  />

                  <IosSwitchRow
                    icon={Contrast}
                    iconBg="bg-[#1C1C1E]"
                    label={str.increaseContrastLabel}
                    description={str.increaseContrastDesc}
                    checked={settings.highContrast}
                    onToggle={() => updateSetting("highContrast", !settings.highContrast)}
                    testId="a11y-toggle-contrast"
                  />

                  <IosSwitchRow
                    icon={Square}
                    iconBg="bg-[#FF9500]"
                    label={str.buttonShapesLabel}
                    description={str.buttonShapesDesc}
                    checked={settings.buttonShapes}
                    onToggle={() => updateSetting("buttonShapes", !settings.buttonShapes)}
                    testId="a11y-toggle-shapes"
                  />
                </div>
              </section>

              {/* Section 2: Color Filters */}
              <section className="flex flex-col gap-2">
                <h3 className="m-0 px-2 text-[12px] font-bold uppercase tracking-wider text-[var(--tp-fg-4A5A4F)]">
                  {str.sectionColorFilters}
                </h3>
                <div className="rounded-[18px] bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] px-4 py-3.5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="w-8 h-8 rounded-[9px] bg-[#FF2D55] text-white flex items-center justify-center shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
                      <Eye className="w-[18px] h-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                        {str.colorFilterLabel}
                      </span>
                      <span className="block text-[12.5px] text-[var(--tp-fg-4A5A4F)] leading-snug">
                        {str.colorFilterDesc}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {colorFilters.map((f) => {
                      const active = settings.colorFilter === f.value;
                      return (
                        <button
                          key={f.value}
                          type="button"
                          data-testid={`a11y-filter-${f.value}`}
                          aria-pressed={active}
                          onClick={() => updateSetting("colorFilter", f.value)}
                          className={cn(
                            "min-h-[36px] px-3 rounded-full border text-[12.5px] font-bold transition-colors",
                            active
                              ? "bg-[var(--tp-bg-2E6B3A)] border-[var(--tp-bg-2E6B3A)] text-white"
                              : "bg-[var(--tp-bg-F6F4EE)] border-[var(--tp-bd-E4DFD2)] text-[var(--tp-fg-17251C)] hover:bg-[var(--tp-bg-E3EFE2)]"
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Section 3: Motion & Touch */}
              <section className="flex flex-col gap-2">
                <h3 className="m-0 px-2 text-[12px] font-bold uppercase tracking-wider text-[var(--tp-fg-4A5A4F)]">
                  {str.sectionMotionTouch}
                </h3>
                <div className="rounded-[18px] bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] divide-y divide-[var(--tp-bd-E4DFD2)] overflow-hidden">
                  <IosSwitchRow
                    icon={Sparkles}
                    iconBg="bg-[#34C759]"
                    label={str.reduceMotionLabel}
                    description={str.reduceMotionDesc}
                    checked={settings.reduceMotion}
                    onToggle={() => updateSetting("reduceMotion", !settings.reduceMotion)}
                    testId="a11y-toggle-motion"
                  />

                  <IosSwitchRow
                    icon={Hand}
                    iconBg="bg-[#30B0C7]"
                    label={str.largerTargetsLabel}
                    description={str.largerTargetsDesc}
                    checked={settings.largeTargets}
                    onToggle={() => updateSetting("largeTargets", !settings.largeTargets)}
                    testId="a11y-toggle-targets"
                  />
                </div>
              </section>

              {/* Section 4: Spoken Content */}
              <section className="flex flex-col gap-2">
                <h3 className="m-0 px-2 text-[12px] font-bold uppercase tracking-wider text-[var(--tp-fg-4A5A4F)]">
                  {str.sectionSpoken}
                </h3>
                <div className="rounded-[18px] bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] px-4 py-3.5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-[9px] bg-[#5AC8FA] text-white flex items-center justify-center shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        <Volume2 className="w-[18px] h-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                          {str.speakScreenLabel}
                        </span>
                        <span className="block text-[12.5px] text-[var(--tp-fg-4A5A4F)] leading-snug">
                          {str.speakScreenDesc}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      data-testid="a11y-speak-btn"
                      onClick={handleSpeakToggle}
                      className={cn(
                        "min-h-[42px] px-4 rounded-full text-[13.5px] font-bold inline-flex items-center gap-2 transition-colors",
                        isSpeaking
                          ? "bg-[var(--tp-bg-8A4B00)] text-white"
                          : "bg-[var(--tp-bg-2E6B3A)] text-white hover:bg-[var(--tp-bg-23542D)]"
                      )}
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{isSpeaking ? str.speakStopBtn : str.speakStartBtn}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold text-[var(--tp-fg-4A5A4F)]">
                        {str.speechSpeedLabel}:
                      </span>
                      {speechRates.map((rate) => {
                        const active = settings.speechRate === rate;
                        return (
                          <button
                            key={rate}
                            type="button"
                            aria-pressed={active}
                            onClick={() => updateSetting("speechRate", rate)}
                            className={cn(
                              "min-h-[32px] px-2.5 rounded-full border text-[12px] font-bold",
                              active
                                ? "bg-[var(--tp-bg-E3EFE2)] border-[var(--tp-bd-2E6B3A)] text-[var(--tp-fg-1F4D28)]"
                                : "bg-[var(--tp-bg-F6F4EE)] border-[var(--tp-bd-E4DFD2)] text-[var(--tp-fg-17251C)]"
                            )}
                          >
                            {rate}×
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Reset & Live Announcement */}
              <div className="flex flex-col gap-2 pb-1">
                <button
                  type="button"
                  data-testid="a11y-reset-btn"
                  onClick={handleReset}
                  className="min-h-[46px] w-full rounded-[16px] border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-8A4B00)] text-[14.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[var(--tp-bg-FCEFD9)] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>{str.resetAllBtn}</span>
                </button>
                <p
                  aria-live="polite"
                  className="m-0 min-h-[18px] text-center text-[12.5px] font-bold text-[var(--tp-fg-1F4D28)]"
                >
                  {statusMsg}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
