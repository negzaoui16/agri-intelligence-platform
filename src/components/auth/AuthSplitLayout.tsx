"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { Compass, Droplets, Satellite, Sprout, Sun } from "lucide-react";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background text-foreground">
      {/* Left: Auth Form Panel */}
      <div className="lg:col-span-6 flex flex-col justify-center px-4 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Link href="/login" className="inline-flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-[var(--tp-bg-14532D)] text-white flex items-center justify-center shrink-0">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-base tracking-tight">TerraPulse</p>
              <p className="text-[11px] text-muted-foreground">
                Agri Intelligence Platform
              </p>
            </div>
          </Link>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>

      {/* Right: Desktop Geospatial Agronomy Showcase */}
      <div className="hidden lg:flex lg:col-span-6 bg-[var(--tp-bg-0F291E)] text-emerald-50 p-12 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(#4ade80 1px, transparent 1px), radial-gradient(#0ea5e9 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            backgroundPosition: "0 0, 18px 18px",
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <Badge variant="green" className="bg-emerald-900/80 text-emerald-200 border-emerald-700">
            Field Decision Support
          </Badge>
          <span className="font-mono text-xs text-emerald-300/80">
            36.451°N • 10.735°E (Tunisia & Med)
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Evaluate every parcel with live climate, water & solar science.
          </h2>
          <p className="text-sm text-emerald-100/85 leading-relaxed">
            Pin your fields on interactive satellite maps, calculate FAO-56 crop water demand across Tunisian and Mediterranean crops, inspect nearby rivers and wells, and size solar pumping systems with JRC PVGIS — even offline in the field.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[var(--tp-bg-FFFFFF)]/5 border border-white/10 space-y-1">
              <Compass className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-semibold text-white">Boundary & GPS Studio</p>
              <p className="text-[11px] text-emerald-100/75">
                Multi-pin & Turf.js area/elevation profiling
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--tp-bg-FFFFFF)]/5 border border-white/10 space-y-1">
              <Droplets className="h-4 w-4 text-sky-400" />
              <p className="text-xs font-semibold text-white">FAO-56 & HydroSHEDS</p>
              <p className="text-[11px] text-emerald-100/75">
                Multi-crop irrigation & hydraulic pump sizing
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--tp-bg-FFFFFF)]/5 border border-white/10 space-y-1">
              <Sun className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-semibold text-white">PVGIS Solar Balance</p>
              <p className="text-[11px] text-emerald-100/75">
                Monthly yield vs. peak summer pump load
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--tp-bg-FFFFFF)]/5 border border-white/10 space-y-1">
              <Satellite className="h-4 w-4 text-emerald-300" />
              <p className="text-xs font-semibold text-white">Offline PWA Sync</p>
              <p className="text-[11px] text-emerald-100/75">
                IndexedDB capture with automatic reconnect sync
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-emerald-200/70">
          Observed weather & satellite data clearly separated from modeled estimates.
        </div>
      </div>
    </div>
  );
}
