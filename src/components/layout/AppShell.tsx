"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bot,
  CloudRain,
  Download,
  Droplets,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Moon,
  RefreshCw,
  Sprout,
  Sun,
  Tractor,
  Wifi,
  WifiOff,
  X,
  AlertTriangle,
} from "lucide-react";
import { Badge, Button, Select } from "@/components/ui/primitives";
import { useFarms, useSyncController } from "@/hooks/useFarms";
import { getSyncConflicts } from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { SyncQueueItem } from "@/types/agri";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/map", label: "Interactive Map", shortLabel: "Map", icon: MapIcon },
  { href: "/farms", label: "Farm Profile", shortLabel: "Farms", icon: Tractor },
  { href: "/environmental", label: "Climate & WaPOR", shortLabel: "Climate", icon: CloudRain },
  { href: "/water", label: "Water & Pump", shortLabel: "Water", icon: Droplets },
  { href: "/solar", label: "Solar PVGIS", shortLabel: "Solar", icon: Sun },
  { href: "/assistant", label: "AI Advisor", shortLabel: "AI", icon: Bot },
  { href: "/reports", label: "Feasibility PDF", shortLabel: "Reports", icon: FileText },
];

const MOBILE_PRIMARY_HREFS = new Set(["/", "/map", "/water", "/solar", "/assistant"]);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { farms, activeFarm, setActiveFarmId } = useFarms();
  const { syncNow, resolveConflict } = useSyncController();

  const isOnline = useAppStore((s) => s.isOnline);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const conflictCount = useAppStore((s) => s.conflictCount);

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [conflicts, setConflicts] = React.useState<SyncQueueItem[]>([]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  React.useEffect(() => {
    if (conflictCount > 0) {
      getSyncConflicts().then(setConflicts);
    } else {
      setConflicts([]);
    }
  }, [conflictCount]);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-card z-30">
        <div className="p-4 border-b border-border flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#14532d] text-white flex items-center justify-center shrink-0">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-tight truncate">TerraPulse</p>
            <p className="text-[11px] text-muted-foreground truncate">Agri Intelligence</p>
          </div>
        </div>

        {/* Active Farm Selector */}
        <div className="p-3 border-b border-border space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active Property
          </label>
          <Select
            value={activeFarm?.id ?? ""}
            onChange={(e) => setActiveFarmId(e.target.value)}
            aria-label="Active Farm Selector"
            className="h-9 text-xs"
          >
            {farms.length === 0 ? (
              <option value="">No saved properties</option>
            ) : (
              farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.areaHectares.toFixed(1)} ha)
                </option>
              ))
            )}
          </Select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-[#14532d] text-white dark:bg-[#16a34a]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status Footer */}
        <div className="p-3 border-t border-border space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={isOnline ? "green" : "amber"}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? "Online" : "Offline Mode"}
            </Badge>
            {pendingSyncCount > 0 && (
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || !isOnline}>
                <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                Sync ({pendingSyncCount})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
            {installEvent && (
              <Button size="sm" variant="primary" className="flex-1" onClick={handleInstall}>
                <Download className="h-3.5 w-3.5" />
                Install
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="no-print lg:hidden sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xs px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#14532d] text-white flex items-center justify-center shrink-0">
            <Sprout className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">
              {activeFarm ? activeFarm.name : "TerraPulse Agri"}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
              <span>{isOnline ? "Online" : "Offline"}</span>
              {pendingSyncCount > 0 && <span>• {pendingSyncCount} queued</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {pendingSyncCount > 0 && isOnline && (
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} aria-label="Sync queued changes">
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            </Button>
          )}
          {installEvent && (
            <Button size="sm" variant="primary" onClick={handleInstall} aria-label="Install PWA">
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden bg-black/50 flex justify-end">
          <div className="w-72 max-w-[85vw] bg-card h-full p-4 flex flex-col gap-4 border-l border-border">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">TerraPulse Navigation</span>
              <Button size="sm" variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Active Property
              </label>
              <Select
                value={activeFarm?.id ?? ""}
                onChange={(e) => {
                  setActiveFarmId(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="mt-1 h-9 text-xs"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      active
                        ? "bg-[#14532d] text-white"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 pb-20 lg:pb-8">
        {/* Sync Conflict Resolution Banner */}
        {conflicts.length > 0 && (
          <div className="no-print bg-amber-50 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800 px-4 py-3">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Sync conflict detected for {conflicts.length} offline edit(s). Newer server data was preserved.
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
                      Keep Server Version
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => resolveConflict(conflicts[0].seq!, "KEEP_LOCAL")}
                    >
                      Push My Offline Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur-xs px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.filter((i) => MOBILE_PRIMARY_HREFS.has(i.href)).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-colors",
                  active
                    ? "text-[#14532d] dark:text-[#4ade80] bg-emerald-50/80 dark:bg-emerald-950/50"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
