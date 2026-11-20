"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataFreshnessBadge } from "@/components/ui/DataFreshnessBadge";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import {
  useFarmAnalysis,
  useFarms,
  useRefreshFarmAnalysis,
  useReports,
} from "@/hooks/useFarms";
import { useAppStore } from "@/lib/store/app-store";
import { formatDistance, formatNumber, formatTimestamp } from "@/lib/utils";
import {
  AlertTriangle,
  Bot,
  CloudRain,
  Droplets,
  FileText,
  Map as MapIcon,
  RefreshCw,
  Sun,
  Tractor,
} from "lucide-react";

export default function DashboardPage() {
  const { farms, activeFarm, setActiveFarmId, isLoading: farmsLoading } = useFarms();
  const { data: analysis, isLoading: analysisLoading } = useFarmAnalysis(activeFarm);
  const refreshMutation = useRefreshFarmAnalysis();
  const { data: reports = [] } = useReports();
  const isOnline = useAppStore((s) => s.isOnline);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);

  const totalAreaHa = farms.reduce((sum, f) => sum + (f.areaHectares || 0), 0);

  if (!farmsLoading && farms.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[#14532d] dark:text-emerald-400">
          <Tractor className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Create Your First Agricultural Property</h1>
        <p className="text-sm text-muted-foreground">
          Drop GPS pins or draw your field boundary on the interactive map to evaluate weather, nearby water sources, pump hydraulics, and solar PV potential.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/map">
            <Button variant="primary">
              <MapIcon className="h-4 w-4" />
              Open Interactive Map
            </Button>
          </Link>
          <Link href="/farms">
            <Button variant="outline">Configure Manually</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Agricultural Decision Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time meteorology, hydrography, FAO-56 crop water balance & PVGIS solar feasibility.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/map">
            <Button size="sm" variant="outline">
              <MapIcon className="h-3.5 w-3.5" />
              Open Map Studio
            </Button>
          </Link>
          {activeFarm && (
            <Button
              size="sm"
              variant="primary"
              disabled={!isOnline || refreshMutation.isPending}
              onClick={() => refreshMutation.mutate(activeFarm.id)}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
              />
              {refreshMutation.isPending ? "Analyzing..." : "Run Live Analysis"}
            </Button>
          )}
        </div>
      </div>

      {/* Portfolio KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered Properties</CardDescription>
            <CardTitle className="text-2xl">{farms.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            {pendingSyncCount > 0 ? `${pendingSyncCount} offline change(s) queued` : "All records synced"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Registered Area</CardDescription>
            <CardTitle className="text-2xl">{totalAreaHa.toFixed(1)} ha</CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Active parcel: {activeFarm ? `${activeFarm.areaHectares.toFixed(2)} ha` : "—"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solar Pump Coverage</CardDescription>
            <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">
              {analysis ? `${analysis.solarVsPump.annualCoveragePct}%` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            {analysis
              ? `${analysis.solar.capacityKwp} kWp PVGIS (${analysis.solarVsPump.worstMonthCoveragePct}% in ${analysis.solarVsPump.worstMonthName})`
              : "Run analysis to compute"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Water & Weather Alerts</CardDescription>
            <CardTitle className="text-2xl text-sky-600 dark:text-sky-400">
              {analysis
                ? `${analysis.weather.alerts.length} alerts`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            {analysis?.climate
              ? `${analysis.climate.aridityClass} (AI ${analysis.climate.aridityIndex})`
              : "Climate status pending"}
          </CardContent>
        </Card>
      </div>

      {/* Active Property Hero + Freshness */}
      {activeFarm && (
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{activeFarm.name}</CardTitle>
                <Badge variant="green">{activeFarm.irrigationConfig.cropCode.toUpperCase()}</Badge>
                <Badge variant="neutral">{activeFarm.soilProfile.textureClass}</Badge>
              </div>
              <CardDescription className="mt-1">
                {activeFarm.centerLat.toFixed(5)}°, {activeFarm.centerLon.toFixed(5)}° •{" "}
                {activeFarm.region || activeFarm.country || "Custom Coordinates"} •{" "}
                {activeFarm.pins.length} GPS pin(s)
              </CardDescription>
            </div>
            {analysis && (
              <DataFreshnessBadge
                retrievedAt={analysis.generatedAt}
                isOffline={!isOnline}
                provenance="OBSERVED"
              />
            )}
          </CardHeader>
          <CardContent>
            {analysisLoading && !analysis ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Querying Open-Meteo, Copernicus DEM, JRC PVGIS, HydroSHEDS & FAO WaPOR v3...
              </div>
            ) : analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                {/* Weather Overview */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <CloudRain className="h-4 w-4" />
                    Weather & Climate (Open-Meteo)
                  </div>
                  <p className="text-xl font-bold">
                    {analysis.weather.current.temperatureC}°C{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      • {analysis.weather.current.weatherSummary}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    365d Rain: <strong>{analysis.climate.annualPrecipMm} mm</strong> vs. ET₀{" "}
                    <strong>{analysis.climate.annualEt0Mm} mm</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Elevation: <strong>{analysis.elevation.farmElevationM} m ASL</strong> • Slope{" "}
                    <strong>{analysis.elevation.estimatedSlopePct}%</strong>
                  </p>
                </div>

                {/* Water Risk Indicator */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <Droplets className="h-4 w-4" />
                    Water & Pump Hydraulics
                  </div>
                  {analysis.waterSources.nearestSource ? (
                    <>
                      <p className="text-sm font-semibold truncate">
                        {analysis.waterSources.nearestSource.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(analysis.waterSources.nearestSource.distanceFromBoundaryM)} away ({analysis.waterSources.nearestSource.sourceType}) • ΔZ{" "}
                        {formatNumber(analysis.waterSources.nearestSource.elevationDiffFromFarmM, 1)} m
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      No mapped water source within 10 km
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Pump Load: <strong>{analysis.pump.electricalPowerKw} kW</strong> • Peak{" "}
                    <strong>{analysis.irrigation.peakDailyWaterM3} m³/day</strong> (unverified water availability)
                  </p>
                </div>

                {/* Solar Potential */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Sun className="h-4 w-4" />
                    Solar PVGIS Potential (Modeled)
                  </div>
                  <p className="text-xl font-bold">
                    {analysis.solar.annualKwh.toLocaleString()} kWh/yr
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analysis.solar.dailyAvgKwh} kWh/day avg • {analysis.solar.specificYieldKwhPerKwp} kWh/kWp
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pump Demand: <strong>{analysis.solarVsPump.annualPumpKwh.toLocaleString()} kWh/yr</strong>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">
                Cached analysis unavailable offline. Connect to the internet to run live scientific engines for this parcel.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>7-Day Rainfall vs. Reference Evapotranspiration (ET₀)</CardTitle>
            <CardDescription>
              Daily crop atmospheric demand (mm/day) compared to forecast rainfall
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {analysis?.weather.daily ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.weather.daily}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} fontSize={11} />
                  <YAxis fontSize={11} unit=" mm" />
                  <Tooltip />
                  <Bar dataKey="precipMm" name="Forecast Rain (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="et0Mm" name="FAO ET₀ (mm)" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Forecast chart populates once analysis completes.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports & Properties</CardTitle>
            <CardDescription>Quick switch or export PDF</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              {farms.slice(0, 3).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    f.id === activeFarm?.id
                      ? "border-[#14532d] bg-emerald-50/70 dark:bg-emerald-950/40"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-semibold truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {f.areaHectares.toFixed(1)} ha • {f.irrigationConfig.cropCode}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs font-semibold">Saved Feasibility Reports ({reports.length})</p>
              {reports.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No reports generated yet. Generate one from the Reports tab.
                </p>
              ) : (
                reports.slice(0, 2).map((r) => (
                  <Link
                    key={r.id}
                    href="/reports"
                    className="block p-2 rounded-lg bg-muted hover:bg-muted/80 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{r.farmName}</span>
                      <Badge variant="green">{r.overallScore}/100</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimestamp(r.createdAt)}
                    </span>
                  </Link>
                ))
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/assistant">
                  <Button size="sm" variant="outline" className="w-full">
                    <Bot className="h-3.5 w-3.5" />
                    Ask AI
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button size="sm" variant="primary" className="w-full">
                    <FileText className="h-3.5 w-3.5" />
                    Reports
                  </Button>
                </Link>
              </div>
            </div>

            {analysis && analysis.weather.alerts.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{analysis.weather.alerts[0].description}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
