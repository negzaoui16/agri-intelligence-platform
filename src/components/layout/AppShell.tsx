"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  RefreshCw,
  Sprout,
  Tractor,
  WifiOff,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/primitives";
import { useAuthSession } from "@/hooks/useAuth";
import { useFarmAnalysis, useFarms, useSyncController } from "@/hooks/useFarms";
import { getSyncConflicts } from "@/lib/offline/sync-engine";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { SyncQueueItem } from "@/types/agri";

const STANDALONE_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/onboarding",
]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t, fmt, monthLabel } = useLanguage();

  const {
    user,
    farmerProfile,
    onboardingProgress,
    isAuthenticated,
    isExpired,
    isLoading: authLoading,
    logout,
  } = useAuthSession();
  const { farms, activeFarm, setActiveFarmId } = useFarms();
  const { data: activeAnalysis } = useFarmAnalysis(activeFarm);
  const { syncNow, resolveConflict } = useSyncController();

  const isOnline = useAppStore((s) => s.isOnline);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const conflictCount = useAppStore((s) => s.conflictCount);

  const [syncing, setSyncing] = React.useState(false);
  const [conflicts, setConflicts] = React.useState<SyncQueueItem[]>([]);

  const isStandalone = STANDALONE_ROUTES.has(pathname);

  React.useEffect(() => {
    if (authLoading || pathname === "/offline") return;
    if (!isAuthenticated && !isStandalone) {
      router.replace(isExpired ? "/login?reason=expired" : "/login");
      return;
    }
    if (
      isAuthenticated &&
      onboardingProgress &&
      !onboardingProgress.isCompleted &&
      !isStandalone
    ) {
      router.replace("/onboarding");
    }
  }, [
    authLoading,
    isAuthenticated,
    isExpired,
    isStandalone,
    onboardingProgress,
    pathname,
    router,
  ]);

  React.useEffect(() => {
    if (conflictCount > 0) {
      getSyncConflicts().then(setConflicts);
    } else {
      setConflicts([]);
    }
  }, [conflictCount]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  if (isStandalone) {
    return <>{children}</>;
  }

  const metrics = activeFarm ? selectFarmerMetrics(activeFarm, activeAnalysis) : null;

  const waterStatusText = metrics
    ? metrics.isWaterShort
      ? fmt(t.shortInMonth, { month: monthLabel(metrics.peakMonthName) })
      : t.statusGood
    : t.statusOk;
  const sunStatusText = metrics
    ? metrics.isSolarShortInSummer
      ? t.shortInSummer
      : t.enoughAllYear
    : t.statusOk;
  const weatherStatusText = metrics
    ? metrics.hasAnyWeatherAlert
      ? t.alertAhead
      : t.calmWeek
    : t.calmWeek;

  const primaryNav = [
    { href: "/", label: t.navHome, icon: Home },
    { href: "/farms", label: t.navMyFarm, icon: Tractor },
    { href: "/assistant", label: t.navAsk, icon: MessageCircle },
    { href: "/reports", label: t.navReport, icon: FileText },
  ];

  const isNavActive = (href: string) => {
    if (href === "/farms" && pathname === "/map") return true;
    return pathname === href;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F6F4EE] text-[#17251C]">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-[256px] lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 border-e-[1.5px] border-[#E4DFD2] bg-white z-30 px-[18px] py-6 gap-[22px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-[12px] bg-[#2E6B3A] text-white flex items-center justify-center shrink-0">
            <Sprout className="w-[22px] h-[22px]" aria-hidden="true" />
          </span>
          <b className="text-[20px] font-bold tracking-tight text-[#17251C]">
            {t.appName}
          </b>
        </div>

        {/* Active Farm Selector */}
        <div className="relative">
          <div className="min-h-[52px] rounded-[14px] border-[1.5px] border-[#C9C3B3] bg-[#F6F4EE] px-3.5 py-2 flex items-center justify-between gap-2 pointer-events-none">
            <span className="min-w-0 flex flex-col text-start">
              <span className="text-[16px] font-bold text-[#17251C] truncate">
                {activeFarm ? activeFarm.name : t.addFarmTitle}
              </span>
              <span className="text-[13px] text-[#4A5A4F] truncate">
                {activeFarm
                  ? `${Number(activeFarm.areaHectares.toFixed(1))} ${t.hectaresShort} · ${t.changeFarm}`
                  : t.threeShortSteps}
              </span>
            </span>
            <ChevronDown className="w-[18px] h-[18px] text-[#17251C] shrink-0" aria-hidden="true" />
          </div>
          <select
            aria-label={t.changeFarm}
            value={activeFarm?.id ?? ""}
            onChange={(e) => setActiveFarmId(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {farms.length === 0 ? (
              <option value="">{t.addFarmTitle}</option>
            ) : (
              farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({Number(f.areaHectares.toFixed(1))} {t.hectaresShort})
                </option>
              ))
            )}
          </select>
        </div>

        {/* 4 Main Farmer Navigation Items */}
        <nav className="flex flex-col gap-1" aria-label="Main">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-h-[48px] rounded-[12px] px-3.5 flex items-center gap-3 text-[17px] transition-colors",
                  active
                    ? "bg-[#E3EFE2] text-[#1F4D28] font-bold"
                    : "text-[#17251C] font-normal hover:bg-[#F6F4EE]"
                )}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] shrink-0",
                    active ? "text-[#1F4D28]" : "text-[#4A5A4F]"
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* CHECK Group (Water, Sun power, Weather) */}
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold text-[#4A5A4F] tracking-[0.06em] px-3.5 uppercase">
            {t.navCheckGroup}
          </span>
          <Link
            href="/water"
            aria-current={pathname === "/water" ? "page" : undefined}
            className={cn(
              "min-h-[44px] rounded-[12px] px-3.5 flex items-center justify-between gap-2 text-[16px] transition-colors",
              pathname === "/water"
                ? "bg-[#E6EEF9] text-[#123766] font-bold"
                : "text-[#17251C] hover:bg-[#F6F4EE]"
            )}
          >
            <span>{t.navWater}</span>
            <span
              className={cn(
                "text-[13px] font-bold whitespace-nowrap",
                metrics?.waterStatus === "PROBLEM" ? "text-[#8A4B00]" : "text-[#2E6B3A]"
              )}
            >
              {waterStatusText}
            </span>
          </Link>

          <Link
            href="/solar"
            aria-current={pathname === "/solar" ? "page" : undefined}
            className={cn(
              "min-h-[44px] rounded-[12px] px-3.5 flex items-center justify-between gap-2 text-[16px] transition-colors",
              pathname === "/solar"
                ? "bg-[#F6ECD6] text-[#5B3A00] font-bold"
                : "text-[#17251C] hover:bg-[#F6F4EE]"
            )}
          >
            <span>{t.navSunPower}</span>
            <span
              className={cn(
                "text-[13px] font-bold whitespace-nowrap",
                metrics?.isSolarShortInSummer ? "text-[#8A4B00]" : "text-[#2E6B3A]"
              )}
            >
              {sunStatusText}
            </span>
          </Link>

          <Link
            href="/environmental"
            aria-current={pathname === "/environmental" ? "page" : undefined}
            className={cn(
              "min-h-[44px] rounded-[12px] px-3.5 flex items-center justify-between gap-2 text-[16px] transition-colors",
              pathname === "/environmental"
                ? "bg-[#E3EFE2] text-[#1F4D28] font-bold"
                : "text-[#17251C] hover:bg-[#F6F4EE]"
            )}
          >
            <span>{t.navWeather}</span>
            <span
              className={cn(
                "text-[13px] font-bold whitespace-nowrap",
                metrics?.hasAnyWeatherAlert ? "text-[#8A4B00]" : "text-[#2E6B3A]"
              )}
            >
              {weatherStatusText}
            </span>
          </Link>
        </div>

        {/* Footer Controls */}
        <div className="mt-auto flex flex-col gap-3">
          {(!isOnline || pendingSyncCount > 0) && (
            <div className="rounded-[12px] border border-[#E2B66B] bg-[#FCEFD9] px-3 py-2 flex items-center justify-between gap-2 text-[14px] text-[#6B3A00]">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <WifiOff className="w-4 h-4 shrink-0" />
                {!isOnline ? "Offline" : `${pendingSyncCount} saved`}
              </span>
              {pendingSyncCount > 0 && isOnline && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="font-bold underline text-[13px]"
                >
                  {syncing ? "…" : "Sync"}
                </button>
              )}
            </div>
          )}

          {user && (
            <div className="pt-2 border-t border-[#E4DFD2] flex items-center justify-between gap-2">
              <span className="text-[14px] text-[#4A5A4F] truncate">
                {farmerProfile
                  ? `${farmerProfile.firstName} ${farmerProfile.lastName}`.trim()
                  : user.name}
              </span>
              <button
                type="button"
                onClick={logout}
                aria-label={t.signOut}
                title={t.signOut}
                className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-[#4A5A4F] hover:bg-[#F6F4EE] hover:text-[#17251C]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Language Switcher Pill matching DeskHome.dc.html */}
          <div
            role="group"
            aria-label={t.changeLanguageLabel}
            className="min-h-[44px] rounded-full border-[1.5px] border-[#C9C3B3] bg-white px-2 flex items-center justify-around gap-1 text-[14px] font-bold"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "min-h-[36px] px-2.5 rounded-full transition-colors",
                lang === "en" ? "bg-[#E3EFE2] text-[#1F4D28]" : "text-[#4A5A4F] hover:text-[#17251C]"
              )}
            >
              English
            </button>
            <span className="text-[#C9C3B3]" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={cn(
                "min-h-[36px] px-2.5 rounded-full transition-colors",
                lang === "ar" ? "bg-[#E3EFE2] text-[#1F4D28]" : "text-[#4A5A4F] hover:text-[#17251C]"
              )}
            >
              العربية
            </button>
            <span className="text-[#C9C3B3]" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setLang("fr")}
              className={cn(
                "min-h-[36px] px-2.5 rounded-full transition-colors",
                lang === "fr" ? "bg-[#E3EFE2] text-[#1F4D28]" : "text-[#4A5A4F] hover:text-[#17251C]"
              )}
            >
              Français
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ps-[256px] pb-[88px] lg:pb-10 min-w-0">
        {/* Offline / Sync Queue Notice on Phone or Conflicts */}
        {(!isOnline || pendingSyncCount > 0) && (
          <div className="no-print lg:hidden bg-[#FCEFD9] border-b border-[#E2B66B] px-4 py-2 flex items-center justify-between text-[14px] text-[#6B3A00]">
            <span className="flex items-center gap-2 font-bold">
              <WifiOff className="w-4 h-4 shrink-0" />
              {!isOnline ? "Working offline — changes saved on phone" : `${pendingSyncCount} change(s) waiting to save`}
            </span>
            {isOnline && pendingSyncCount > 0 && (
              <button type="button" onClick={handleSync} disabled={syncing} className="inline-flex items-center gap-1 font-bold underline">
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                Sync
              </button>
            )}
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="no-print bg-[#FCEFD9] border-b border-[#E2B66B] px-4 py-3">
            <div className="max-w-[1080px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[15px]">
              <div className="flex items-center gap-2 text-[#6B3A00]">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>
                  {conflicts.length} offline edit(s) differ from your saved cloud data.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {conflicts[0]?.seq !== undefined && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveConflict(conflicts[0].seq!, "ACCEPT_SERVER")}
                    >
                      Keep cloud version
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => resolveConflict(conflicts[0].seq!, "KEEP_LOCAL")}
                    >
                      Keep my phone edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-[1120px] mx-auto px-5 py-4 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile 4-Tab Bottom Navigation Bar matching Main.dc.html */}
      <nav
        aria-label="Main"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 bg-white border-t-[1.5px] border-[#E4DFD2] px-1.5 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-[12px] text-[14px] transition-colors",
                active ? "text-[#2E6B3A] font-bold" : "text-[#4A5A4F] font-normal"
              )}
            >
              <Icon
                className={cn(
                  "w-[26px] h-[26px]",
                  active ? "text-[#2E6B3A]" : "text-[#4A5A4F]"
                )}
                strokeWidth={active ? 2.2 : 1.9}
                aria-hidden="true"
              />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
