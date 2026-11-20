"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
  Input,
} from "@/components/ui/primitives";
import { useFarmAnalysis, useFarms, useRefreshFarmAnalysis } from "@/hooks/useFarms";
import { evaluateWeatherAlerts } from "@/lib/services/open-meteo";
import { useAppStore } from "@/lib/store/app-store";
import { AlertTriangle, CloudRain, Mountain, RefreshCw, Satellite } from "lucide-react";

export default function EnvironmentalPage() {
  const { activeFarm } = useFarms();
  const { data: analysis, isLoading } = useFarmAnalysis(activeFarm);
  const refresh = useRefreshFarmAnalysis();
  const isOnline = useAppStore((s) => s.isOnline);
  const thresholds = useAppStore((s) => s.alertThresholds);
  const setThresholds = useAppStore((s) => s.setAlertThresholds);

  const dynamicAlerts = React.useMemo(() => {
    if (!analysis?.weather.daily) return [];
    return evaluateWeatherAlerts(analysis.weather.daily, thresholds);
  }, [analysis?.weather.daily, thresholds]);

  if (!activeFarm) {
    return <p className="text-sm text-muted-foreground">Select or create a farm first.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Environmental, Climate & FAO WaPOR Analysis
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Open-Meteo forecast & ERA5 archive, Copernicus DEM terrain, and FAO WaPOR v3 remote sensing.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!isOnline || refresh.isPending}
          onClick={() => refresh.mutate(activeFarm.id)}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
          Refresh Datasets
        </Button>
      </div>

      {analysis && (
        <DataFreshnessBadge
          retrievedAt={analysis.weather.citation.retrievedAt}
          provenance="OBSERVED"
          isOffline={!isOnline}
          providerLabel="Open-Meteo + Copernicus DEM + FAO WaPOR v3"
        />
      )}

      {isLoading && !analysis ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading environmental & satellite datasets for {activeFarm.name}...
          </CardContent>
        </Card>
      ) : analysis ? (
        <>
          {/* Current Weather & Terrain KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Weather</CardDescription>
                <CardTitle className="text-2xl">{analysis.weather.current.temperatureC}°C</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {analysis.weather.current.weatherSummary} • RH {analysis.weather.current.relativeHumidityPct}% • Wind{" "}
                {analysis.weather.current.windSpeedKmh} km/h
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Annual Rainfall (365d)</CardDescription>
                <CardTitle className="text-2xl text-sky-600 dark:text-sky-400">
                  {analysis.climate.annualPrecipMm} mm
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Reference ET₀: {analysis.climate.annualEt0Mm} mm/yr
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>UNEP Aridity Index</CardDescription>
                <CardTitle className="text-2xl">{analysis.climate.aridityIndex}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <Badge variant={analysis.climate.aridityIndex < 0.2 ? "amber" : "green"}>
                  {analysis.climate.aridityClass}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Elevation & Slope</CardDescription>
                <CardTitle className="text-2xl">{analysis.elevation.farmElevationM} m</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Slope {analysis.elevation.estimatedSlopePct}% ({analysis.elevation.slopeAspect}) • Relief{" "}
                {analysis.elevation.fieldReliefM} m
              </CardContent>
            </Card>
          </div>

          {/* 12-Month Historical Climate Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-sky-600" />
                12-Month Historical Climate Profile ({analysis.climate.periodStart} to {analysis.climate.periodEnd})
              </CardTitle>
              <CardDescription>
                Monthly precipitation vs. FAO-56 ET₀ (mm) and mean temperature (°C) • Annual GDD (base 10°C):{" "}
                {analysis.climate.annualGddBase10}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analysis.climate.monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="monthName" fontSize={11} />
                  <YAxis yAxisId="left" fontSize={11} unit=" mm" />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} unit="°C" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="precipSumMm" name="Rainfall (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="et0SumMm" name="ET₀ Demand (mm)" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="tempMeanAvgC" name="Mean Temp (°C)" stroke="#14532d" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seasonal Breakdown + Configurable Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Water Balance & 7-Day Forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2">Season</th>
                        <th className="py-2">Rain</th>
                        <th className="py-2">ET₀</th>
                        <th className="py-2">Mean T</th>
                        <th className="py-2">Deficit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.climate.seasons.map((s) => (
                        <tr key={s.season} className="border-b border-border/50">
                          <td className="py-2 font-medium">
                            {s.season} <span className="text-muted-foreground">({s.months})</span>
                          </td>
                          <td className="py-2">{s.precipSumMm} mm</td>
                          <td className="py-2">{s.et0SumMm} mm</td>
                          <td className="py-2">{s.tempMeanAvgC}°C</td>
                          <td className="py-2 font-semibold text-amber-700 dark:text-amber-400">
                            {s.moistureDeficitMm} mm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-2">7-Day Daily Forecast</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {analysis.weather.daily.slice(0, 4).map((d) => (
                      <div key={d.date} className="p-2 rounded-lg bg-muted">
                        <p className="font-semibold">{d.date.slice(5)}</p>
                        <p>{d.tempMinC}° / {d.tempMaxC}°C</p>
                        <p className="text-sky-700 dark:text-sky-300">Rain: {d.precipMm} mm</p>
                        <p className="text-amber-700 dark:text-amber-300">ET₀: {d.et0Mm ?? "—"} mm</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Configurable Weather Threshold Alerts ({dynamicAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-muted-foreground">Frost ≤ (°C)</label>
                    <Input
                      type="number"
                      value={thresholds.frostMinTempC}
                      onChange={(e) => setThresholds({ frostMinTempC: Number(e.target.value) })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground">Heat ≥ (°C)</label>
                    <Input
                      type="number"
                      value={thresholds.heatMaxTempC}
                      onChange={(e) => setThresholds({ heatMaxTempC: Number(e.target.value) })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground">Wind ≥ (km/h)</label>
                    <Input
                      type="number"
                      value={thresholds.highWindKmh}
                      onChange={(e) => setThresholds({ highWindKmh: Number(e.target.value) })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                {dynamicAlerts.length === 0 ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30">
                    No 7-day forecast days breach the configured agronomic alert thresholds.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {dynamicAlerts.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{a.title}</span>
                          <Badge variant={a.severity === "CRITICAL" ? "red" : "amber"}>{a.date}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{a.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FAO WaPOR v3 + Elevation Points */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-emerald-700" />
                  FAO WaPOR v3 Remote Sensing Water Productivity
                </CardTitle>
                <CardDescription>
                  Retrieved from FAO GISMGR v2 COG rasters • {analysis.wapor.limitations}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {analysis.wapor.layers.map((layer) => (
                    <div key={layer.mapsetCode} className="p-3 rounded-lg border border-border text-xs">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-semibold text-[11px]">{layer.mapsetCode}</span>
                        <Badge variant={layer.value !== null ? "blue" : "neutral"}>
                          {layer.year}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {layer.caption}
                      </p>
                      <p className="text-base font-bold mt-1.5">
                        {layer.value !== null ? `${layer.value} ${layer.unit}` : "Not available"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Res: {layer.spatialResolution}
                      </p>
                    </div>
                  ))}
                </div>
                {analysis.wapor.relativeEvapotranspiration !== null && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Relative Evapotranspiration (AETI / RET):{" "}
                    <strong>{analysis.wapor.relativeEvapotranspiration}</strong> (values near 1.0 indicate well-watered vegetation; low values indicate dryland/fallow cover).
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-emerald-700" />
                  DEM Elevation Samples
                </CardTitle>
                <CardDescription>90 m Copernicus DEM profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {analysis.elevation.samplePoints.map((pt, idx) => (
                  <div
                    key={`${pt.label}_${idx}`}
                    className="flex items-center justify-between py-1.5 border-b border-border/50"
                  >
                    <span className="text-muted-foreground">{pt.label}</span>
                    <span className="font-mono font-semibold">{pt.elevationM} m</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
