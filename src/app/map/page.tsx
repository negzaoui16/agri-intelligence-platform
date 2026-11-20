"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  InteractiveFarmMap,
  type BaseLayerId,
} from "@/components/map/InteractiveFarmMap";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@/components/ui/primitives";
import {
  useFarmAnalysis,
  useFarms,
  useRefreshFarmAnalysis,
  useSaveFarm,
} from "@/hooks/useFarms";
import { useAppStore } from "@/lib/store/app-store";
import { formatDistance, formatNumber } from "@/lib/utils";
import type { FarmPin, FarmRecord, GeoPolygon, PinRole } from "@/types/agri";
import {
  CloudRain,
  Compass,
  Droplets,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

export default function MapPage() {
  const router = useRouter();
  const { farms, activeFarm, setActiveFarmId } = useFarms();
  const { data: analysis } = useFarmAnalysis(activeFarm);
  const saveFarm = useSaveFarm();
  const refreshAnalysis = useRefreshFarmAnalysis();

  const mapMode = useAppStore((s) => s.mapToolMode);
  const setMapMode = useAppStore((s) => s.setMapToolMode);
  const isOnline = useAppStore((s) => s.isOnline);

  const [baseLayer, setBaseLayer] = React.useState<BaseLayerId>("satellite");
  const [showWaterOverlay, setShowWaterOverlay] = React.useState(true);
  const [showWeatherOverlay, setShowWeatherOverlay] = React.useState(false);
  const [pinRole, setPinRole] = React.useState<PinRole>("FIELD_CENTER");
  const [newLat, setNewLat] = React.useState("");
  const [newLon, setNewLon] = React.useState("");
  const [newFarmName, setNewFarmName] = React.useState("");
  const [inspectedCoord, setInspectedCoord] = React.useState<{
    lat: number;
    lon: number;
  } | null>(null);

  React.useEffect(() => {
    if (activeFarm) {
      setNewLat(activeFarm.centerLat.toFixed(5));
      setNewLon(activeFarm.centerLon.toFixed(5));
    }
  }, [activeFarm]);

  const handleAddPin = async (lat: number, lon: number, role: PinRole) => {
    if (!activeFarm) return;
    const newPin: FarmPin = {
      id: `pin_${Date.now()}`,
      farmId: activeFarm.id,
      label: `${role.replace("_", " ")} #${activeFarm.pins.length + 1}`,
      role,
      latitude: lat,
      longitude: lon,
      elevationM: null,
      createdAt: new Date().toISOString(),
    };
    const updated: FarmRecord = {
      ...activeFarm,
      pins: [...activeFarm.pins, newPin],
    };
    await saveFarm.mutateAsync({ farm: updated });
  };

  const handleDeletePin = async (pinId: string) => {
    if (!activeFarm) return;
    await saveFarm.mutateAsync({
      farm: {
        ...activeFarm,
        pins: activeFarm.pins.filter((p) => p.id !== pinId),
      },
    });
  };

  const handleBoundaryChange = async (
    boundary: GeoPolygon | null,
    areaHectares: number,
    perimeterMeters: number
  ) => {
    if (!activeFarm) return;
    await saveFarm.mutateAsync({
      farm: {
        ...activeFarm,
        boundary,
        areaHectares,
        perimeterMeters,
        irrigationConfig: {
          ...activeFarm.irrigationConfig,
          irrigatedAreaHa: areaHectares,
        },
      },
    });
  };

  const handleCreatePropertyAtCoords = async () => {
    const lat = Number(newLat);
    const lon = Number(newLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const id = `farm_${Date.now()}`;
    const now = new Date().toISOString();
    const base = activeFarm ?? farms[0];
    const farm: FarmRecord = {
      id,
      userId: "user_demo_agronomist",
      name: newFarmName.trim() || `Parcel (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
      centerLat: lat,
      centerLon: lon,
      elevationM: null,
      areaHectares: 5.0,
      perimeterMeters: 900,
      boundary: null,
      pins: [
        {
          id: `pin_${id}_1`,
          farmId: id,
          label: "Field Reference Pin",
          role: "FIELD_CENTER",
          latitude: lat,
          longitude: lon,
          elevationM: null,
          createdAt: now,
        },
      ],
      soilProfile: base?.soilProfile ?? {
        textureClass: "LOAM",
        fieldCapacityMmM: 270,
        wiltingPointMmM: 120,
        tawMmM: 150,
        infiltrationRateMmHr: 15,
        source: "Default Loam Baseline",
        updatedAt: now,
      },
      solarConfig: base?.solarConfig ?? {
        capacityKwp: 8,
        tiltDeg: Math.min(55, Math.max(10, Math.round(Math.abs(lat) * 0.87))),
        azimuthDeg: 0,
        mountingType: "free",
        systemLossPct: 14,
        optimizeAngles: false,
        updatedAt: now,
      },
      pumpConfig: base?.pumpConfig ?? {
        flowRateM3Hr: 20,
        staticHeadM: 15,
        pipeLengthM: 180,
        pipeDiameterMm: 75,
        pipeMaterialC: 140,
        frictionLossM: 3.5,
        operatingPressureHeadM: 15,
        totalDynamicHeadM: 33.5,
        pumpEfficiencyPct: 65,
        motorEfficiencyPct: 88,
        operatingHoursDay: 6,
        updatedAt: now,
      },
      irrigationConfig: {
        cropCode: "tomato",
        irrigatedAreaHa: 5.0,
        irrigationMethod: "DRIP",
        applicationEfficiencyPct: 90,
        plantingMonth: 3,
      },
      createdAt: now,
      updatedAt: now,
    };

    await saveFarm.mutateAsync({ farm, isNew: true });
    setNewFarmName("");
    if (isOnline) {
      await refreshAnalysis.mutateAsync(farm.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Geospatial Land & Boundary Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Drop multiple GPS pins, draw or drag field boundary vertices, inspect water proximity & elevation, and trigger analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={showWaterOverlay ? "primary" : "outline"}
            onClick={() => setShowWaterOverlay((v) => !v)}
          >
            <Droplets className="h-3.5 w-3.5" />
            Water Sources
          </Button>
          <Button
            size="sm"
            variant={showWeatherOverlay ? "primary" : "outline"}
            onClick={() => setShowWeatherOverlay((v) => !v)}
          >
            <CloudRain className="h-3.5 w-3.5" />
            Radar Overlay
          </Button>
          {activeFarm && (
            <Button
              size="sm"
              variant="outline"
              disabled={!isOnline || refreshAnalysis.isPending}
              onClick={() => refreshAnalysis.mutate(activeFarm.id)}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshAnalysis.isPending ? "animate-spin" : ""}`}
              />
              Analyze Parcel
            </Button>
          )}
        </div>
      </div>

      {/* Pin Role & Quick Create Bar */}
      <Card>
        <CardContent className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
          <div className="md:col-span-3">
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Pin Drop Role
            </label>
            <Select
              value={pinRole}
              onChange={(e) => setPinRole(e.target.value as PinRole)}
              className="mt-1 h-9 text-xs"
            >
              <option value="FIELD_CENTER">Field Center</option>
              <option value="WELL_CANDIDATE">Well Candidate</option>
              <option value="SOLAR_ARRAY">Solar Array Pad</option>
              <option value="PUMP_INTAKE">Pump Intake Point</option>
              <option value="SOIL_SAMPLE">Soil Sample Point</option>
              <option value="CUSTOM">Custom Marker</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              New Property Name
            </label>
            <Input
              placeholder="e.g., North Terrace Plot"
              value={newFarmName}
              onChange={(e) => setNewFarmName(e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Latitude
            </label>
            <Input
              value={newLat}
              onChange={(e) => setNewLat(e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Longitude
            </label>
            <Input
              value={newLon}
              onChange={(e) => setNewLon(e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <Button
              size="sm"
              className="w-full h-9"
              onClick={handleCreatePropertyAtCoords}
              disabled={saveFarm.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Here
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Map Canvas */}
      <InteractiveFarmMap
        centerLat={activeFarm?.centerLat ?? 36.605}
        centerLon={activeFarm?.centerLon ?? 2.945}
        boundary={activeFarm?.boundary ?? null}
        pins={activeFarm?.pins ?? []}
        waterSources={analysis?.waterSources.sources}
        farms={farms}
        activeFarmId={activeFarm?.id}
        mode={mapMode}
        activePinRole={pinRole}
        showWaterOverlay={showWaterOverlay}
        showWeatherOverlay={showWeatherOverlay}
        baseLayer={baseLayer}
        onModeChange={setMapMode}
        onBaseLayerChange={setBaseLayer}
        onSelectFarm={(fid) => setActiveFarmId(fid)}
        onAddPin={handleAddPin}
        onBoundaryChange={handleBoundaryChange}
        onCoordinateInspect={(lat, lon) => {
          setInspectedCoord({ lat, lon });
          setNewLat(lat.toFixed(5));
          setNewLon(lon.toFixed(5));
        }}
      />

      {/* Property Metrics + Pins List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-700" />
              Spatial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted">
                <p className="text-muted-foreground">Calculated Area</p>
                <p className="text-base font-bold">
                  {activeFarm ? `${activeFarm.areaHectares.toFixed(2)} ha` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {activeFarm
                    ? `${Math.round(activeFarm.areaHectares * 10000).toLocaleString()} m²`
                    : ""}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted">
                <p className="text-muted-foreground">Perimeter</p>
                <p className="text-base font-bold">
                  {activeFarm ? `${Math.round(activeFarm.perimeterMeters)} m` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Elev: {analysis?.elevation.farmElevationM ?? activeFarm?.elevationM ?? "—"} m
                </p>
              </div>
            </div>

            {inspectedCoord && (
              <div className="p-2.5 rounded-lg border border-border">
                <p className="text-muted-foreground">Last Inspected Coordinate</p>
                <p className="font-mono font-semibold">
                  {inspectedCoord.lat.toFixed(5)}°, {inspectedCoord.lon.toFixed(5)}°
                </p>
              </div>
            )}

            {analysis?.waterSources.nearestSource && (
              <div className="p-2.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
                <p className="font-semibold text-sky-900 dark:text-sky-200">
                  Nearest Mapped Feature
                </p>
                <p>
                  {analysis.waterSources.nearestSource.name} (
                  {analysis.waterSources.nearestSource.sourceType})
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {formatDistance(analysis.waterSources.nearestSource.distanceFromBoundaryM)}{" "}
                  from edge • ΔZ{" "}
                  {formatNumber(analysis.waterSources.nearestSource.elevationDiffFromFarmM, 1)} m
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/water")}
              >
                Water & Pump
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="flex-1"
                onClick={() => router.push("/reports")}
              >
                Full Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-700" />
                GPS Pins on {activeFarm?.name ?? "Parcel"} ({activeFarm?.pins.length ?? 0})
              </span>
              <Badge variant="neutral">Tap “Drop Pin” above then click map</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {!activeFarm || activeFarm.pins.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pins added yet.</p>
            ) : (
              activeFarm.pins.map((pin) => (
                <div
                  key={pin.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pin.label}</span>
                      <Badge variant="green">{pin.role.replace("_", " ")}</Badge>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {pin.latitude.toFixed(5)}°, {pin.longitude.toFixed(5)}°
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePin(pin.id)}
                    aria-label={`Remove ${pin.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
