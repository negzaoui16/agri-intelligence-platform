"use client";

import * as React from "react";
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
  Input,
  Select,
} from "@/components/ui/primitives";
import { useFarmAnalysis, useFarms, useSaveFarm } from "@/hooks/useFarms";
import { IRRIGATION_EFFICIENCY_DEFAULTS } from "@/lib/db/defaults";
import {
  CROP_DATABASE,
  calculateCropWaterRequirements,
} from "@/lib/engines/fao56-calculator";
import { calculatePumpEnergy } from "@/lib/engines/pump-calculator";
import { useAppStore } from "@/lib/store/app-store";
import { formatDistance, formatNumber } from "@/lib/utils";
import type { IrrigationMethod, WaterSourcesResult } from "@/types/agri";
import { AlertTriangle, Droplets, Gauge, Save, Sprout, Waves } from "lucide-react";

export default function WaterAndIrrigationPage() {
  const { activeFarm } = useFarms();
  const { data: analysis } = useFarmAnalysis(activeFarm);
  const saveFarm = useSaveFarm();
  const isOnline = useAppStore((s) => s.isOnline);

  const [radiusM, setRadiusM] = React.useState(10000);
  const [customWaterData, setCustomWaterData] = React.useState<WaterSourcesResult | null>(null);
  const [queryingWater, setQueryingWater] = React.useState(false);

  // Interactive FAO-56 crop water state
  const [cropCode, setCropCode] = React.useState("tomato");
  const [irrigatedAreaHa, setIrrigatedAreaHa] = React.useState(5);
  const [irrigationMethod, setIrrigationMethod] = React.useState<IrrigationMethod>("DRIP");
  const [plantingMonth, setPlantingMonth] = React.useState(3);

  // Interactive Hydraulic Pump state
  const [flowRateM3Hr, setFlowRateM3Hr] = React.useState(20);
  const [staticHeadM, setStaticHeadM] = React.useState(15);
  const [pipeLengthM, setPipeLengthM] = React.useState(180);
  const [pipeDiameterMm, setPipeDiameterMm] = React.useState(75);
  const [operatingPressureHeadM, setOperatingPressureHeadM] = React.useState(15);
  const [pumpEfficiencyPct, setPumpEfficiencyPct] = React.useState(65);
  const [motorEfficiencyPct, setMotorEfficiencyPct] = React.useState(88);
  const [operatingHoursDay, setOperatingHoursDay] = React.useState(6);
  const [savedFlag, setSavedFlag] = React.useState(false);

  React.useEffect(() => {
    if (!activeFarm) return;
    setCropCode(activeFarm.irrigationConfig.cropCode);
    setIrrigatedAreaHa(activeFarm.areaHectares);
    setIrrigationMethod(activeFarm.irrigationConfig.irrigationMethod);
    setPlantingMonth(activeFarm.irrigationConfig.plantingMonth);

    setFlowRateM3Hr(activeFarm.pumpConfig.flowRateM3Hr);
    setStaticHeadM(activeFarm.pumpConfig.staticHeadM);
    setPipeLengthM(activeFarm.pumpConfig.pipeLengthM);
    setPipeDiameterMm(activeFarm.pumpConfig.pipeDiameterMm);
    setOperatingPressureHeadM(activeFarm.pumpConfig.operatingPressureHeadM);
    setPumpEfficiencyPct(activeFarm.pumpConfig.pumpEfficiencyPct);
    setMotorEfficiencyPct(activeFarm.pumpConfig.motorEfficiencyPct);
    setOperatingHoursDay(activeFarm.pumpConfig.operatingHoursDay);
    setCustomWaterData(null);
  }, [activeFarm]);

  const waterData = customWaterData ?? analysis?.waterSources ?? null;

  const liveCropWater = React.useMemo(() => {
    if (!analysis?.climate.monthly) return analysis?.irrigation ?? null;
    return calculateCropWaterRequirements({
      cropCode,
      irrigatedAreaHa,
      irrigationMethod,
      plantingMonth,
      monthlyClimate: analysis.climate.monthly,
      soilProfile: activeFarm?.soilProfile,
      pumpFlowRateM3Hr: flowRateM3Hr,
    });
  }, [
    analysis?.climate.monthly,
    analysis?.irrigation,
    cropCode,
    irrigatedAreaHa,
    irrigationMethod,
    plantingMonth,
    activeFarm?.soilProfile,
    flowRateM3Hr,
  ]);

  const livePump = React.useMemo(
    () =>
      calculatePumpEnergy({
        flowRateM3Hr,
        staticElevationDiffM: staticHeadM,
        pipeLengthM,
        pipeDiameterMm,
        operatingPressureHeadM,
        pumpEfficiencyPct,
        motorEfficiencyPct,
        operatingHoursDay,
      }),
    [
      flowRateM3Hr,
      staticHeadM,
      pipeLengthM,
      pipeDiameterMm,
      operatingPressureHeadM,
      pumpEfficiencyPct,
      motorEfficiencyPct,
      operatingHoursDay,
    ]
  );

  const handleQueryWater = async () => {
    if (!activeFarm || !isOnline) return;
    setQueryingWater(true);
    try {
      const res = await fetch(
        `/api/water-sources?lat=${activeFarm.centerLat}&lon=${activeFarm.centerLon}&radius=${radiusM}&farmId=${activeFarm.id}`
      );
      if (res.ok) {
        const json = await res.json();
        setCustomWaterData(json.waterSources);
      }
    } finally {
      setQueryingWater(false);
    }
  };

  const handleSaveToFarm = async () => {
    if (!activeFarm) return;
    const now = new Date().toISOString();
    await saveFarm.mutateAsync({
      farm: {
        ...activeFarm,
        irrigationConfig: {
          cropCode,
          irrigatedAreaHa,
          irrigationMethod,
          applicationEfficiencyPct: IRRIGATION_EFFICIENCY_DEFAULTS[irrigationMethod].efficiencyPct,
          plantingMonth,
        },
        pumpConfig: {
          ...activeFarm.pumpConfig,
          flowRateM3Hr,
          staticHeadM,
          pipeLengthM,
          pipeDiameterMm,
          frictionLossM: livePump.frictionLossM,
          operatingPressureHeadM,
          totalDynamicHeadM: livePump.totalDynamicHeadM,
          pumpEfficiencyPct,
          motorEfficiencyPct,
          operatingHoursDay,
          updatedAt: now,
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
            Water Sources, FAO-56 Demand & Pump Hydraulics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            OpenStreetMap + HydroSHEDS hydrography, deterministic hydraulic head calculator & PI-Advisor FAO-56 water balance.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={handleSaveToFarm} disabled={saveFarm.isPending}>
          <Save className="h-3.5 w-3.5" />
          {savedFlag ? "Saved!" : "Save Config to Farm"}
        </Button>
      </div>

      {/* Mandatory Non-Operational Warning */}
      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <strong>Field Verification Notice:</strong>{" "}
          {waterData?.mandatoryWarning ??
            "A mapped river, stream, reservoir, or well indicates geographic location only and does NOT confirm perennial water flow, water quality, or abstraction rights."}
        </div>
      </div>

      {/* Mapped Water Sources + HydroSHEDS Basin */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-sky-600" />
              Nearby Mapped Water Features & HydroSHEDS Watershed
            </CardTitle>
            {waterData && (
              <div className="mt-1.5">
                <DataFreshnessBadge
                  retrievedAt={waterData.retrievedAt}
                  provenance="OBSERVED"
                  isOffline={!isOnline}
                  providerLabel="OSM Overpass + WWF HydroSHEDS"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(radiusM)}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="h-9 text-xs w-32"
            >
              <option value="2000">2 km radius</option>
              <option value="5000">5 km radius</option>
              <option value="10000">10 km radius</option>
              <option value="20000">20 km radius</option>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!isOnline || queryingWater}
              onClick={handleQueryWater}
            >
              {queryingWater ? "Querying..." : "Re-Query"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {waterData?.hydroBasin && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-muted">
                <span className="text-muted-foreground">HydroBASINS ID</span>
                <p className="font-mono font-bold mt-0.5">{waterData.hydroBasin.hybasId ?? "—"}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted">
                <span className="text-muted-foreground">Upstream Area</span>
                <p className="font-bold mt-0.5">
                  {formatNumber(waterData.hydroBasin.upstreamAreaKm2, 0)} km²
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted">
                <span className="text-muted-foreground">Pfafstetter Code</span>
                <p className="font-mono font-bold mt-0.5">
                  {waterData.hydroBasin.pfafstetterId ?? "—"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted">
                <span className="text-muted-foreground">Basin Irrig. Water Gap</span>
                <p className="font-bold mt-0.5">
                  {waterData.hydroBasin.irrigationWaterGap !== null
                    ? `${waterData.hydroBasin.irrigationWaterGap} (idx)`
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {!waterData || waterData.sources.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">
              No mapped water features detected within {(radiusM / 1000).toFixed(0)} km in public OSM/HydroSHEDS datasets.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Feature Name</th>
                    <th className="py-2 pr-3">Type / Source</th>
                    <th className="py-2 pr-3">Distance</th>
                    <th className="py-2 pr-3">Elev. Diff (ΔZ)</th>
                    <th className="py-2 pr-3">Status & Confidence</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waterData.sources.slice(0, 12).map((ws) => (
                    <tr key={ws.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">
                        {ws.name}
                        <div className="text-[10px] text-muted-foreground">
                          {ws.spatialRelationship.replace("_", " ")} • {ws.cardinalDirection} ({ws.bearingDegrees}°)
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="blue">{ws.sourceType}</Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{ws.provider}</div>
                      </td>
                      <td className="py-2 pr-3 font-mono">
                        {formatDistance(ws.distanceFromBoundaryM)}
                        <div className="text-[10px] text-muted-foreground">
                          center: {formatDistance(ws.distanceFromCentroidM)}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono">
                        {ws.elevationDiffFromFarmM !== null
                          ? `${ws.elevationDiffFromFarmM > 0 ? "+" : ""}${ws.elevationDiffFromFarmM} m`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="amber">Unverified Operational</Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{ws.confidence}</div>
                      </td>
                      <td className="py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStaticHeadM(Math.max(0, ws.elevationDiffFromFarmM ?? 10));
                            setPipeLengthM(Math.max(20, Math.round(ws.distanceFromBoundaryM * 1.15)));
                          }}
                        >
                          Use Head
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deterministic Pump Energy Calculator + FAO-56 Crop Water Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hydraulic Pump Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-600" />
              Deterministic Pump Hydraulic & Energy Calculator
            </CardTitle>
            <CardDescription>
              Formula: P = (ρ × g × Q × H) / η • Elevation lift is only one component of Total Dynamic Head.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="font-medium">Flow (m³/h)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={flowRateM3Hr}
                  onChange={(e) => setFlowRateM3Hr(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Static Lift (m)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={staticHeadM}
                  onChange={(e) => setStaticHeadM(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Pipe Len (m)</label>
                <Input
                  type="number"
                  value={pipeLengthM}
                  onChange={(e) => setPipeLengthM(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Pipe ID (mm)</label>
                <Input
                  type="number"
                  value={pipeDiameterMm}
                  onChange={(e) => setPipeDiameterMm(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Emitter Head (m)</label>
                <Input
                  type="number"
                  value={operatingPressureHeadM}
                  onChange={(e) => setOperatingPressureHeadM(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Pump Eff (%)</label>
                <Input
                  type="number"
                  value={pumpEfficiencyPct}
                  onChange={(e) => setPumpEfficiencyPct(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Motor Eff (%)</label>
                <Input
                  type="number"
                  value={motorEfficiencyPct}
                  onChange={(e) => setMotorEfficiencyPct(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Hours / Day</label>
                <Input
                  type="number"
                  step="0.5"
                  value={operatingHoursDay}
                  onChange={(e) => setOperatingHoursDay(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-muted-foreground">Total Dynamic Head</span>
                <p className="text-lg font-bold">{livePump.totalDynamicHeadM} m</p>
                <span className="text-[10px] text-muted-foreground">
                  Static {livePump.staticHeadM} + Friction {livePump.frictionLossM} + Fittings {livePump.fittingsLossM} + Emitter {livePump.operatingPressureHeadM}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-muted-foreground">Electrical Pump Power</span>
                <p className="text-lg font-bold text-sky-700 dark:text-sky-400">
                  {livePump.electricalPowerKw} kW
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Hydraulic: {livePump.hydraulicPowerKw} kW ({livePump.combinedEfficiencyPct}% comb.)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-muted-foreground">Daily / Monthly Energy</span>
                <p className="text-lg font-bold">{livePump.dailyEnergyKwh} kWh/d</p>
                <span className="text-[10px] text-muted-foreground">
                  {livePump.monthlyEnergyKwh} kWh/mo • {livePump.dailyVolumeM3} m³/d
                </span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border pt-2">
              {livePump.engineeringNotes.map((note, idx) => (
                <p key={idx}>• {note}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAO-56 Crop Water Requirement Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-emerald-700" />
              FAO-56 & PI-Advisor Crop Water Demand
            </CardTitle>
            <CardDescription>
              Deterministic ETc = Kc × ETo with USDA-SCS effective rainfall & root-zone soil water balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <label className="font-medium">Crop</label>
                <Select
                  value={cropCode}
                  onChange={(e) => setCropCode(e.target.value)}
                  className="mt-1 h-9 text-xs"
                >
                  {CROP_DATABASE.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="font-medium">Area (ha)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={irrigatedAreaHa}
                  onChange={(e) => setIrrigatedAreaHa(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-medium">Method</label>
                <Select
                  value={irrigationMethod}
                  onChange={(e) => {
                    const m = e.target.value as IrrigationMethod;
                    setIrrigationMethod(m);
                    setOperatingPressureHeadM(IRRIGATION_EFFICIENCY_DEFAULTS[m].typicalPressureHeadM);
                  }}
                  className="mt-1 h-9 text-xs"
                >
                  <option value="DRIP">Drip (90%)</option>
                  <option value="SUBSURFACE_DRIP">Subsurface Drip (94%)</option>
                  <option value="CENTER_PIVOT">Center Pivot (82%)</option>
                  <option value="SPRINKLER">Sprinkler (75%)</option>
                  <option value="FURROW">Furrow (60%)</option>
                </Select>
              </div>
              <div>
                <label className="font-medium">Plant Month</label>
                <Select
                  value={String(plantingMonth)}
                  onChange={(e) => setPlantingMonth(Number(e.target.value))}
                  className="mt-1 h-9 text-xs"
                >
                  {Array.from({ length: 12 }, (_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Month {idx + 1}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {liveCropWater ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Annual ETc</span>
                    <p className="text-base font-bold">{liveCropWater.annualEtcMm} mm</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Gross Volume</span>
                    <p className="text-base font-bold text-sky-700 dark:text-sky-400">
                      {liveCropWater.annualGrossVolumeM3.toLocaleString()} m³
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Peak ({liveCropWater.peakMonthName})</span>
                    <p className="text-base font-bold">
                      {liveCropWater.peakDailyWaterM3} m³/d
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Interval: {liveCropWater.peakIrrigationIntervalDays}d
                    </span>
                  </div>
                </div>

                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveCropWater.monthly}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="monthName" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="etcMm" name="Crop ETc (mm)" fill="#15803d" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="grossIrrigationMm" name="Gross Irrigation (mm)" fill="#0284c7" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{liveCropWater.missingDataWarnings[0]}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFlowRateM3Hr(
                        Math.max(2, Number((liveCropWater.peakDailyWaterM3 / operatingHoursDay).toFixed(1)))
                      )
                    }
                  >
                    <Droplets className="h-3 w-3" />
                    Size Flow to Peak
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Run historical climate analysis once online to compute monthly FAO-56 ETc schedule.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
