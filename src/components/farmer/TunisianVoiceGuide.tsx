"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { TOUR_UI_STRINGS, TUNISIAN_TOUR_STEPS } from "@/lib/tour/tunisian-tour-steps";
import { cn } from "@/lib/utils";

const TOUR_SEEN_KEY = "tp_tunisian_tour_seen_v1";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findVisibleTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const list = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const el of list) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function TunisianVoiceGuide() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, isRtl } = useLanguage();
  const ui = TOUR_UI_STRINGS[lang];

  const [isOpen, setIsOpen] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [showInvite, setShowInvite] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [autoAdvance, setAutoAdvance] = React.useState(true);
  const [rect, setRect] = React.useState<SpotlightRect | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const autoTimerRef = React.useRef<number | null>(null);
  const isOpenRef = React.useRef(false);
  const autoAdvanceRef = React.useRef(autoAdvance);

  React.useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  React.useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  const stopAudio = React.useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  // Show gentle 1-time invite badge on first visit
  React.useEffect(() => {
    try {
      const seen = window.localStorage.getItem(TOUR_SEEN_KEY);
      if (!seen) {
        const timer = window.setTimeout(() => setShowInvite(true), 1200);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const markSeen = React.useCallback(() => {
    setShowInvite(false);
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      // Ignore
    }
  }, []);

  const closeTour = React.useCallback(() => {
    stopAudio();
    setIsOpen(false);
    setRect(null);
    markSeen();
  }, [markSeen, stopAudio]);

  const startTour = React.useCallback(() => {
    markSeen();
    setStepIndex(0);
    setIsOpen(true);
  }, [markSeen]);

  // Listen for sidebar trigger event
  React.useEffect(() => {
    const handler = () => startTour();
    window.addEventListener("tp:start-tunisian-tour", handler);
    return () => window.removeEventListener("tp:start-tunisian-tour", handler);
  }, [startTour]);

  const step = TUNISIAN_TOUR_STEPS[stepIndex] ?? TUNISIAN_TOUR_STEPS[0];

  const handleAdvanceOrFinish = React.useCallback(() => {
    if (!isOpenRef.current) return;
    if (stepIndex < TUNISIAN_TOUR_STEPS.length - 1) {
      setStepIndex((i) => Math.min(TUNISIAN_TOUR_STEPS.length - 1, i + 1));
    } else {
      closeTour();
    }
  }, [closeTour, stepIndex]);

  const playCurrentStepAudio = React.useCallback(
    (stepObj: (typeof TUNISIAN_TOUR_STEPS)[number]) => {
      stopAudio();
      if (typeof window === "undefined") return;

      const scheduleNextIfAuto = () => {
        if (!isOpenRef.current || !autoAdvanceRef.current) return;
        autoTimerRef.current = window.setTimeout(() => {
          handleAdvanceOrFinish();
        }, 650);
      };

      const speakFallback = () => {
        if (!("speechSynthesis" in window) || muted) {
          setIsPlaying(false);
          return;
        }
        const utter = new SpeechSynthesisUtterance(stepObj.subtitleDerja);
        utter.lang = "ar-TN";
        utter.rate = 0.96;
        utter.onend = () => {
          setIsPlaying(false);
          scheduleNextIfAuto();
        };
        utter.onerror = () => setIsPlaying(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utter);
      };

      try {
        const audio = new Audio(stepObj.audioUrl);
        audio.muted = muted;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          scheduleNextIfAuto();
        };
        audio.onerror = () => speakFallback();
        setIsPlaying(true);
        const p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => speakFallback());
        }
      } catch {
        speakFallback();
      }
    },
    [handleAdvanceOrFinish, muted, stopAudio]
  );

  // Sync mute state to active HTMLAudioElement
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [muted]);

  // Play step audio cleanly only when guide opens or active step changes (not on pathname settle)
  React.useEffect(() => {
    if (!isOpen) return;
    playCurrentStepAudio(step);
  }, [isOpen, step, playCurrentStepAudio]);

  // Navigate to step route and track visible spotlight bounding box
  React.useEffect(() => {
    if (!isOpen) return;

    if (pathname !== step.route) {
      setRect(null);
      router.push(step.route);
    }

    let cancelled = false;
    let attempts = 0;

    const measureAndFocus = () => {
      const target = findVisibleTarget(step.targetSelector);
      if (target) {
        const r = target.getBoundingClientRect();
        const pad = 8;
        setRect({
          top: Math.max(4, r.top - pad),
          left: Math.max(4, r.left - pad),
          width: r.width + pad * 2,
          height: r.height + pad * 2,
        });
        return true;
      }
      return false;
    };

    const tryFocus = () => {
      if (cancelled) return false;
      const target = findVisibleTarget(step.targetSelector);
      if (target) {
        measureAndFocus();
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
          if (!cancelled) measureAndFocus();
        }, 280);
        return true;
      }
      return false;
    };

    let pollTimer: number | null = null;
    if (!tryFocus()) {
      pollTimer = window.setInterval(() => {
        attempts += 1;
        if (tryFocus() || attempts >= 20) {
          if (attempts >= 20 && !findVisibleTarget(step.targetSelector)) {
            setRect(null);
          }
          if (pollTimer !== null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
        }
      }, 120);
    }

    const onReflow = () => {
      if (!cancelled) measureAndFocus();
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);

    return () => {
      cancelled = true;
      if (pollTimer !== null) window.clearInterval(pollTimer);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [isOpen, pathname, router, step]);

  React.useEffect(() => () => stopAudio(), [stopAudio]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (autoTimerRef.current !== null) {
          window.clearTimeout(autoTimerRef.current);
          autoTimerRef.current = null;
        }
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    if (isPlaying) {
      stopAudio();
    } else {
      playCurrentStepAudio(step);
    }
  };

  if (!isOpen) {
    return (
      <div className="no-print fixed bottom-[86px] lg:bottom-6 end-4 lg:end-6 z-40 flex flex-col items-end gap-2.5 max-w-[calc(100vw-2rem)]">
        {showInvite && (
          <div className="rounded-[18px] border-[1.5px] border-[var(--tp-bd-7FB083)] bg-[var(--tp-bg-FFFFFF)] shadow-xl p-4 max-w-[330px] flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <b className="text-[16px] text-[var(--tp-fg-17251C)] leading-snug">
                {ui.welcomeTitle}
              </b>
              <button
                type="button"
                onClick={markSeen}
                aria-label={ui.close}
                className="p-1 text-[var(--tp-fg-4A5A4F)] hover:text-[var(--tp-fg-17251C)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="m-0 text-[14px] text-[var(--tp-fg-4A5A4F)] leading-snug">
              {ui.welcomeBody}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={startTour}
                className="min-h-[40px] px-4 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[14px] font-bold inline-flex items-center gap-1.5 hover:bg-[var(--tp-bg-23542D)]"
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
                <span>{ui.startTour}</span>
              </button>
              <button
                type="button"
                onClick={markSeen}
                className="min-h-[40px] px-3 rounded-full border border-[var(--tp-bd-C9C3B3)] text-[14px] font-bold text-[var(--tp-fg-4A5A4F)]"
              >
                {ui.skipTour}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          data-testid="open-tunisian-guide-btn"
          onClick={startTour}
          className="min-h-[48px] px-4 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white shadow-lg border border-white/15 text-[15px] font-bold inline-flex items-center gap-2 hover:bg-[var(--tp-bg-23542D)] transition-transform active:scale-95"
        >
          <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{ui.floatingButton}</span>
        </button>
      </div>
    );
  }

  const pct = Math.round(((stepIndex + 1) / TUNISIAN_TOUR_STEPS.length) * 100);
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="no-print" role="dialog" aria-modal="false" aria-label={ui.floatingButton}>
      {/* Spotlight Highlight Box or Fallback Dim Backdrop */}
      {rect ? (
        <div
          data-testid="tour-spotlight"
          aria-hidden="true"
          className="fixed z-40 pointer-events-none rounded-[18px] border-[3px] border-[var(--tp-bg-2E6B3A)] transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(15, 25, 19, 0.54)",
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 pointer-events-none bg-black/45 transition-opacity"
        />
      )}

      {/* Interactive Voice Guide Control Panel */}
      <div className="fixed bottom-[86px] lg:bottom-6 end-4 lg:end-6 start-4 sm:start-auto sm:w-[420px] z-50 rounded-[22px] border-2 border-[var(--tp-bd-7FB083)] bg-[var(--tp-bg-FFFFFF)] shadow-2xl p-4 lg:p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-1F4D28)] text-[12px] font-bold">
                <Mic className={cn("w-3.5 h-3.5", isPlaying && "animate-pulse")} />
                <span>{ui.speakingBadge}</span>
              </span>
              <span className="text-[13px] font-bold text-[var(--tp-fg-4A5A4F)]">
                {ui.stepOf
                  .replace("{current}", String(stepIndex + 1))
                  .replace("{total}", String(TUNISIAN_TOUR_STEPS.length))}
              </span>
            </div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--tp-fg-17251C)] leading-snug">
              {step.title[lang]}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeTour}
            aria-label={ui.close}
            className="w-9 h-9 rounded-full border border-[var(--tp-bd-E4DFD2)] flex items-center justify-center text-[var(--tp-fg-4A5A4F)] hover:text-[var(--tp-fg-17251C)] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 rounded-full bg-[var(--tp-bg-F6F4EE)] overflow-hidden">
          <div
            className="h-full bg-[var(--tp-bg-2E6B3A)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Tunisian Derja Subtitles */}
        <p
          dir="rtl"
          className="m-0 rounded-[14px] bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] p-3 text-[16px] leading-[1.55] font-medium text-[var(--tp-fg-17251C)] text-right"
        >
          {step.subtitleDerja}
        </p>

        {/* Playback + Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? ui.pause : ui.play}
              className="min-h-[40px] px-3 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[14px] font-bold inline-flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? ui.pause : ui.play}</span>
            </button>
            <button
              type="button"
              onClick={() => playCurrentStepAudio(step)}
              aria-label={ui.replay}
              title={ui.replay}
              className="min-h-[40px] w-10 rounded-full border border-[var(--tp-bd-C9C3B3)] flex items-center justify-center text-[var(--tp-fg-17251C)]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? ui.unmute : ui.mute}
              title={muted ? ui.unmute : ui.mute}
              className="min-h-[40px] w-10 rounded-full border border-[var(--tp-bd-C9C3B3)] flex items-center justify-center text-[var(--tp-fg-17251C)]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => {
                stopAudio();
                setStepIndex((i) => Math.max(0, i - 1));
              }}
              className="min-h-[40px] px-3 rounded-full border border-[var(--tp-bd-C9C3B3)] text-[14px] font-bold text-[var(--tp-fg-17251C)] inline-flex items-center gap-1 disabled:opacity-40"
            >
              <PrevIcon className="w-4 h-4" />
              <span>{ui.prev}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopAudio();
                handleAdvanceOrFinish();
              }}
              className="min-h-[40px] px-3.5 rounded-full bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] text-[14px] font-bold inline-flex items-center gap-1"
            >
              <span>
                {stepIndex === TUNISIAN_TOUR_STEPS.length - 1 ? ui.finish : ui.next}
              </span>
              {stepIndex < TUNISIAN_TOUR_STEPS.length - 1 && <NextIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAutoAdvance((v) => !v)}
          className="self-start text-[12px] font-bold text-[var(--tp-fg-4A5A4F)] hover:text-[var(--tp-fg-17251C)]"
        >
          {autoAdvance ? ui.autoAdvanceOn : ui.autoAdvanceOff}
        </button>
      </div>
    </div>
  );
}
