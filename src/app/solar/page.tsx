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
  Select,
} from "@/components/ui/primitives";
import { useFarmAnalysis, useFarms, useSaveFarm } from "@/hooks/useFarms";
import { calculatePumpEnergy } from "@/lib/engines/pump-calculator";
import { compareSolarAndPumpEnergy } from "@/lib/engines/solar-irrigation-matcher";
import { useAppStore } from "@/lib/store/app-store";
import type { SolarAnalysisResult } from "@/types/agri";
import { AlertTriangle, Battery, RefreshCw, Save, Sun } from "lucide-react";

export default function SolarEnergyPage() {
  const { activeFarm } = useFarms();
  const { data: analysis } = useFarmAnalysis(activeFarm);
  const saveFarm = useSaveFarm();
  const isOnline = useAppStore((s) => s.isOnline);

  const [capacityKwp, setCapacityKwp] = React.useState(10);
  const [tiltDeg, setTiltDeg] = React.useState(32);
  const [azimuthDeg, setAzimuthDeg] = React.useState(0);
  const [mountingType, setMountingType] = React.useState<"free" | "building">("free");
  const [systemLossPct, setSystemLossPct] = React.useState(14);
  const [optimizeAngles, setOptimizeAngles] = React.useState(false);

  const [simSolar, setSimSolar] = React.useState<SolarAnalysisResult | null>(null);
  const [simLoading, setSimLoading] = React.useState(false);
  const [savedFlag, setSavedFlag] = React.useState(false);

  React.useEffect(() => {
    if (!activeFarm) return;
    setCapacityKwp(activeFarm.solarConfig.capacityKwp);
    setTiltDeg(activeFarm.solarConfig.tiltDeg);
    setAzimuthDeg(activeFarm.solarConfig.azimuthDeg);
    setMountingType(activeFarm.solarConfig.mountingType);
    setSystemLossPct(activeFarm.solarConfig.systemLossPct);
    setOptimizeAngles(activeFarm.solarConfig.optimizeAngles);
    setSimSolar(null);
  }, [activeFarm]);

  const solarData = simSolar ?? analysis?.solar ?? null;

  const comparison = React.useMemo(() => {
    if (!solarData || !activeFarm) return analysis?.solarVsPump ?? null;
    const pumpRes =
      analysis?.pump ??
      calculatePumpEnergy({
        flowRateM3Hr: activeFarm.pumpConfig.flowRateM3Hr,
        staticElevationDiffM: activeFarm.pumpConfig.staticHeadM,
        pipeLengthM: activeFarm.pumpConfig.pipeLengthM,
        pipeDiameterMm: activeFarm.pumpConfig.pipeDiameterMm,
        operatingPressureHeadM: activeFarm.pumpConfig.operatingPressureHeadM,
        pumpEfficiencyPct: activeFarm.pumpConfig.pumpEfficiencyPct,
        motorEfficiencyPct: activeFarm.pumpConfig.motorEfficiencyPct,
        operatingHoursDay: activeFarm.pumpConfig.operatingHoursDay,
      });

    return compareSolarAndPumpEnergy({
      solarMonthly: solarData.monthly,
      pumpResult: pumpRes,
      cropWaterResult: analysis?.irrigation,
    });
  }, [solarData, activeFarm, analysis]);

  const runPVGISSimulation = async (useOptimal = optimizeAngles) => {
    if (!activeFarm || !isOnline) return;
    setSimLoading(true);
    try {
      const qs = new URLSearchParams({
        lat: String(activeFarm.centerLat),
        lon: String(activeFarm.centerLon),
        capacity: String(capacityKwp),
        tilt: String(tiltDeg),
        azimuth: String(azimuthDeg),
        mounting: mountingType,
        loss: String(systemLossPct),
        optimal: String(useOptimal),
      });
      const res = await fetch(`/api/solar?${qs.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as { solar: SolarAnalysisResult };
        setSimSolar(json.solar);
        if (useOptimal) {
          setTiltDeg(json.solar.tiltDeg);
          setAzimuthDeg(json.solar.azimuthDeg);
        }
      }
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!activeFarm) return;
    await saveFarm.mutateAsync({
      farm: {
        ...activeFarm,
        solarConfig: {
          capacityKwp,
          tiltDeg,
          azimuthDeg,
          mountingType,
          systemLossPct,
          optimizeAngles,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 3000);
  };

  if (!activeFarm) {
    return <p className="text-sm text-muted-foreground">Select or create a farm first.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Solar PVGIS Simulator & Irrigation Energy Match
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real European Commission JRC PVGIS v5.3 modeling — values represent modeled estimates, not metered output.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveConfig} disabled={saveFarm.isPending}>
            <Save className="h-3.5 w-3.5" />
            {savedFlag ? "Saved!" : "Save PV Config"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!isOnline || simLoading}
            onClick={() => runPVGISSimulation()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${simLoading ? "animate-spin" : ""}`} />
            {simLoading ? "Simulating..." : "Simulate PVGIS"}
          </Button>
        </div>
      </div>

      {solarData && (
        <DataFreshnessBadge
          retrievedAt={solarData.citation.retrievedAt}
          provenance="MODELED"
          isOffline={!isOnline}
          providerLabel={solarData.citation.provider}
        />
      )}

      {/* Interactive Array Simulator Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-600" />
            Interactive Photovoltaic Array Configuration
          </CardTitle>
          <CardDescription>
            Adjust installed kWp, tilt, orientation (0° = South, -90° = East, 90° = West), and system losses then recalculate with PVGIS.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs items-end">
          <div>
            <label className="font-medium">Capacity (kWp)</label>
            <Input
              type="number"
              step="0.5"
              value={capacityKwp}
              onChange={(e) => setCapacityKwp(Number(e.target.value))}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div>
            <label className="font-medium">Tilt (°)</label>
            <Input
              type="number"
              min="0"
              max="90"
              value={tiltDeg}
              onChange={(e) => setTiltDeg(Number(e.target.value))}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div>
            <label className="font-medium">Azimuth (°)</label>
            <Input
              type="number"
              min="-180"
              max="180"
              value={azimuthDeg}
              onChange={(e) => setAzimuthDeg(Number(e.target.value))}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div>
            <label className="font-medium">Mounting</label>
            <Select
              value={mountingType}
              onChange={(e) => setMountingType(e.target.value as "free" | "building")}
              className="mt-1 h-9 text-xs"
            >
              <option value="free">Ground Mount</option>
              <option value="building">Roof Mount</option>
            </Select>
          </div>
          <div>
            <label className="font-medium">System Loss (%)</label>
            <Input
              type="number"
              min="2"
              max="40"
              value={systemLossPct}
              onChange={(e) => setSystemLossPct(Number(e.target.value))}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-9"
              disabled={!isOnline || simLoading}
              onClick={() => {
                setOptimizeAngles(true);
                runPVGISSimulation(true);
              }}
            >
              Use Optimal Angles
            </Button>
          </div>
        </CardContent>
      </Card>

      {solarData && comparison ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Est. Annual Production</CardDescription>
                <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">
                  {solarData.annualKwh.toLocaleString()} kWh
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {solarData.dailyAvgKwh} kWh/day avg • {solarData.specificYieldKwhPerKwp} kWh/kWp
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Annual Pump Coverage</CardDescription>
                <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-400">
                  {comparison.annualCoveragePct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Pump demand: {comparison.annualPumpKwh.toLocaleString()} kWh/yr
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Peak Month Coverage ({comparison.worstMonthName})</CardDescription>
                <CardTitle className="text-2xl">
                  {comparison.worstMonthCoveragePct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {comparison.worstMonthDeficitKwh > 0
                  ? `${comparison.worstMonthDeficitKwh} kWh shortfall`
                  : "No monthly shortfall"}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Buffer Sizing Options</CardDescription>
                <CardTitle className="text-lg">
                  {comparison.recommendedWaterStorageTankM3} m³ tank
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Or ~{comparison.recommendedBatteryKwh} kWh battery • Grid dep.{" "}
                {comparison.estimatedGridDependencyPct}%
              </CardContent>
            </Card>
          </div>

          {/* Monthly Solar vs Pump Energy Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly PVGIS Solar Generation vs. Irrigation Pump Demand (kWh)</CardTitle>
              <CardDescription>
                Evaluates seasonal alignment between solar irradiance and peak crop irrigation requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={comparison.monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="monthName" fontSize={11} />
                  <YAxis fontSize={11} unit=" kWh" />
                  <Tooltip />
                  <Bar dataKey="solarKwh" name="Modeled PV Yield (kWh)" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pumpKwh" name="Est. Pump Demand (kWh)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="coveragePct" name="Coverage (%)" stroke="#14532d" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seasonal Breakdown + Engineering Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Solar Yield & PVGIS Loss Factors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {solarData.seasonal.map((s) => (
                    <div key={s.season} className="p-2.5 rounded-lg bg-muted">
                      <p className="font-semibold">{s.season}</p>
                      <p className="text-base font-bold mt-0.5">{s.kwh.toLocaleString()} kWh</p>
                      <p className="text-[11px] text-muted-foreground">{s.sharePct}% of annual</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border flex flex-wrap gap-2">
                  <Badge variant="neutral">
                    Total PVGIS Losses: {solarData.lossesBreakdown.totalLossPct}%
                  </Badge>
                  {solarData.lossesBreakdown.temperatureAndIrradiancePct !== null && (
                    <Badge variant="amber">
                      Temp/Irradiance Loss: {solarData.lossesBreakdown.temperatureAndIrradiancePct}%
                    </Badge>
                  )}
                  <Badge variant="green">
                    Direct-Drive Pumping: {comparison.directDriveFeasible ? "Feasible" : "Needs Buffer"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-emerald-700" />
                  Storage & Off-Grid Realism Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {comparison.engineeringWarnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Run solar simulation while online to load PVGIS monthly curves.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
