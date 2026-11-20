"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useDeleteFarm, useFarms, useSaveFarm } from "@/hooks/useFarms";
import { IRRIGATION_EFFICIENCY_DEFAULTS, SOIL_TEXTURE_DEFAULTS } from "@/lib/db/defaults";
import { CROP_DATABASE } from "@/lib/engines/fao56-calculator";
import { useAppStore } from "@/lib/store/app-store";
import type { FarmRecord, IrrigationMethod, SoilTextureClass } from "@/types/agri";
import { Plus, Save, Trash2 } from "lucide-react";

const farmProfileSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  centerLat: z.coerce.number().min(-90).max(90),
  centerLon: z.coerce.number().min(-180).max(180),
  areaHectares: z.coerce.number().min(0.05).max(50000),
  cropCode: z.string(),
  plantingMonth: z.coerce.number().int().min(1).max(12),
  soilTexture: z.enum(["SANDY", "SANDY_LOAM", "LOAM", "SILT_LOAM", "CLAY_LOAM", "CLAY"]),
  irrigationMethod: z.enum(["DRIP", "SUBSURFACE_DRIP", "SPRINKLER", "CENTER_PIVOT", "FURROW"]),
  capacityKwp: z.coerce.number().min(0.2).max(5000),
  tiltDeg: z.coerce.number().min(0).max(90),
  azimuthDeg: z.coerce.number().min(-180).max(180),
  systemLossPct: z.coerce.number().min(1).max(50),
  flowRateM3Hr: z.coerce.number().min(0.5).max(1000),
  staticHeadM: z.coerce.number().min(0).max(300),
  pipeLengthM: z.coerce.number().min(1).max(10000),
  pipeDiameterMm: z.coerce.number().min(20).max(500),
  pumpEfficiencyPct: z.coerce.number().min(20).max(90),
  operatingHoursDay: z.coerce.number().min(1).max(24),
});

type FarmProfileFormValues = z.infer<typeof farmProfileSchema>;

export default function FarmsPage() {
  const { farms, activeFarm, setActiveFarmId } = useFarms();
  const saveFarm = useSaveFarm();
  const deleteFarm = useDeleteFarm();
  const isOnline = useAppStore((s) => s.isOnline);
  const [creatingNew, setCreatingNew] = React.useState(false);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  const form = useForm<FarmProfileFormValues>({
    resolver: zodResolver(farmProfileSchema),
    defaultValues: {
      name: "",
      country: "",
      region: "",
      centerLat: 36.605,
      centerLon: 2.945,
      areaHectares: 5,
      cropCode: "tomato",
      plantingMonth: 3,
      soilTexture: "LOAM",
      irrigationMethod: "DRIP",
      capacityKwp: 8,
      tiltDeg: 32,
      azimuthDeg: 0,
      systemLossPct: 14,
      flowRateM3Hr: 20,
      staticHeadM: 15,
      pipeLengthM: 180,
      pipeDiameterMm: 75,
      pumpEfficiencyPct: 65,
      operatingHoursDay: 6,
    },
  });

  React.useEffect(() => {
    if (!creatingNew && activeFarm) {
      form.reset({
        name: activeFarm.name,
        description: activeFarm.description ?? "",
        country: activeFarm.country ?? "",
        region: activeFarm.region ?? "",
        centerLat: activeFarm.centerLat,
        centerLon: activeFarm.centerLon,
        areaHectares: activeFarm.areaHectares,
        cropCode: activeFarm.irrigationConfig.cropCode,
        plantingMonth: activeFarm.irrigationConfig.plantingMonth,
        soilTexture: activeFarm.soilProfile.textureClass,
        irrigationMethod: activeFarm.irrigationConfig.irrigationMethod,
        capacityKwp: activeFarm.solarConfig.capacityKwp,
        tiltDeg: activeFarm.solarConfig.tiltDeg,
        azimuthDeg: activeFarm.solarConfig.azimuthDeg,
        systemLossPct: activeFarm.solarConfig.systemLossPct,
        flowRateM3Hr: activeFarm.pumpConfig.flowRateM3Hr,
        staticHeadM: activeFarm.pumpConfig.staticHeadM,
        pipeLengthM: activeFarm.pumpConfig.pipeLengthM,
        pipeDiameterMm: activeFarm.pumpConfig.pipeDiameterMm,
        pumpEfficiencyPct: activeFarm.pumpConfig.pumpEfficiencyPct,
        operatingHoursDay: activeFarm.pumpConfig.operatingHoursDay,
      });
    }
  }, [activeFarm, creatingNew, form]);

  const onSubmit = async (values: FarmProfileFormValues) => {
    const now = new Date().toISOString();
    const soilDefaults = SOIL_TEXTURE_DEFAULTS[values.soilTexture as SoilTextureClass];
    const irrDefaults =
      IRRIGATION_EFFICIENCY_DEFAULTS[values.irrigationMethod as IrrigationMethod];
    const isNew = creatingNew || !activeFarm;
    const id = isNew ? `farm_${Date.now()}` : activeFarm.id;

    const record: FarmRecord = {
      id,
      userId: activeFarm?.userId ?? "user_demo_agronomist",
      name: values.name,
      description: values.description ?? null,
      country: values.country ?? null,
      region: values.region ?? null,
      centerLat: values.centerLat,
      centerLon: values.centerLon,
      elevationM: isNew ? null : activeFarm?.elevationM ?? null,
      areaHectares: values.areaHectares,
      perimeterMeters: isNew
        ? Math.round(4 * Math.sqrt(values.areaHectares * 10000))
        : activeFarm?.perimeterMeters ?? 400,
      boundary: isNew ? null : activeFarm?.boundary ?? null,
      pins: isNew
        ? [
            {
              id: `pin_${id}_center`,
              farmId: id,
              label: "Field Center",
              role: "FIELD_CENTER",
              latitude: values.centerLat,
              longitude: values.centerLon,
              elevationM: null,
              createdAt: now,
            },
          ]
        : activeFarm.pins,
      soilProfile: {
        ...soilDefaults,
        source: "User Configured Soil Texture",
        updatedAt: now,
      },
      solarConfig: {
        capacityKwp: values.capacityKwp,
        tiltDeg: values.tiltDeg,
        azimuthDeg: values.azimuthDeg,
        mountingType: activeFarm?.solarConfig.mountingType ?? "free",
        systemLossPct: values.systemLossPct,
        optimizeAngles: activeFarm?.solarConfig.optimizeAngles ?? false,
        updatedAt: now,
      },
      pumpConfig: {
        flowRateM3Hr: values.flowRateM3Hr,
        staticHeadM: values.staticHeadM,
        pipeLengthM: values.pipeLengthM,
        pipeDiameterMm: values.pipeDiameterMm,
        pipeMaterialC: 140,
        frictionLossM: activeFarm?.pumpConfig.frictionLossM ?? 3.5,
        operatingPressureHeadM: irrDefaults.typicalPressureHeadM,
        totalDynamicHeadM:
          values.staticHeadM + irrDefaults.typicalPressureHeadM + 3.5,
        pumpEfficiencyPct: values.pumpEfficiencyPct,
        motorEfficiencyPct: 88,
        operatingHoursDay: values.operatingHoursDay,
        updatedAt: now,
      },
      irrigationConfig: {
        cropCode: values.cropCode,
        irrigatedAreaHa: values.areaHectares,
        irrigationMethod: values.irrigationMethod,
        applicationEfficiencyPct: irrDefaults.efficiencyPct,
        plantingMonth: values.plantingMonth,
      },
      createdAt: isNew ? now : activeFarm.createdAt,
      updatedAt: now,
    };

    await saveFarm.mutateAsync({ farm: record, isNew });
    setCreatingNew(false);
    setSavedNotice(
      isOnline
        ? "Saved and synchronized with server."
        : "Saved offline in IndexedDB and queued for synchronization."
    );
    setTimeout(() => setSavedNotice(null), 5000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Farm Profile & Engineering Configuration
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Works online and offline — edits persist in IndexedDB and queue for sync automatically.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={creatingNew ? "secondary" : "primary"}
            onClick={() => {
              setCreatingNew(true);
              form.reset({
                ...form.getValues(),
                name: "",
                country: "",
                region: "",
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Property
          </Button>
          {activeFarm && !creatingNew && farms.length > 1 && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => deleteFarm.mutate(activeFarm.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
          {savedNotice}
        </div>
      )}

      {/* Property Switcher Cards */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {farms.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setCreatingNew(false);
              setActiveFarmId(f.id);
            }}
            className={`shrink-0 px-3 py-2 rounded-xl border text-xs text-left cursor-pointer ${
              !creatingNew && f.id === activeFarm?.id
                ? "border-[#14532d] bg-[#14532d] text-white"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <div className="font-semibold">{f.name}</div>
            <div className="opacity-80 text-[11px]">
              {f.areaHectares.toFixed(1)} ha • {f.centerLat.toFixed(3)}°, {f.centerLon.toFixed(3)}°
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Identity & Location */}
          <Card>
            <CardHeader>
              <CardTitle>
                {creatingNew ? "New Agricultural Property" : "Property Coordinates & Crop"}
              </CardTitle>
              <CardDescription>
                Or edit boundaries directly in the Interactive Map Studio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="font-medium">Farm Name</label>
                <Input {...form.register("name")} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium">Country</label>
                  <Input {...form.register("country")} className="mt-1" />
                </div>
                <div>
                  <label className="font-medium">Region / Basin</label>
                  <Input {...form.register("region")} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-medium">Latitude</label>
                  <Input type="number" step="0.0001" {...form.register("centerLat")} className="mt-1" />
                </div>
                <div>
                  <label className="font-medium">Longitude</label>
                  <Input type="number" step="0.0001" {...form.register("centerLon")} className="mt-1" />
                </div>
                <div>
                  <label className="font-medium">Area (ha)</label>
                  <Input type="number" step="0.1" {...form.register("areaHectares")} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium">Primary Crop</label>
                  <Select {...form.register("cropCode")} className="mt-1">
                    {CROP_DATABASE.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="font-medium">Planting Month</label>
                  <Select {...form.register("plantingMonth")} className="mt-1">
                    {Array.from({ length: 12 }, (_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Month {idx + 1}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Soil & Irrigation */}
          <Card>
            <CardHeader>
              <CardTitle>Soil Profile & Irrigation Method</CardTitle>
              <CardDescription>
                Used by FAO-56 root-zone soil water balance & net demand models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium">Soil Texture Class</label>
                  <Select {...form.register("soilTexture")} className="mt-1">
                    <option value="SANDY">Sandy (TAW 70 mm/m)</option>
                    <option value="SANDY_LOAM">Sandy Loam (TAW 110 mm/m)</option>
                    <option value="LOAM">Loam (TAW 150 mm/m)</option>
                    <option value="SILT_LOAM">Silt Loam (TAW 175 mm/m)</option>
                    <option value="CLAY_LOAM">Clay Loam (TAW 165 mm/m)</option>
                    <option value="CLAY">Clay (TAW 150 mm/m)</option>
                  </Select>
                </div>
                <div>
                  <label className="font-medium">Irrigation System</label>
                  <Select {...form.register("irrigationMethod")} className="mt-1">
                    <option value="DRIP">Surface Drip (90% eff.)</option>
                    <option value="SUBSURFACE_DRIP">Subsurface Drip (94% eff.)</option>
                    <option value="CENTER_PIVOT">Center Pivot (82% eff.)</option>
                    <option value="SPRINKLER">Sprinkler (75% eff.)</option>
                    <option value="FURROW">Furrow (60% eff.)</option>
                  </Select>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="font-semibold mb-2">Pump & Hydraulic Baseline</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-medium">Flow (m³/h)</label>
                    <Input type="number" step="0.5" {...form.register("flowRateM3Hr")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Static Lift (m)</label>
                    <Input type="number" step="0.5" {...form.register("staticHeadM")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Hours / Day</label>
                    <Input type="number" step="0.5" {...form.register("operatingHoursDay")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Pipe Length (m)</label>
                    <Input type="number" {...form.register("pipeLengthM")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Pipe ID (mm)</label>
                    <Input type="number" {...form.register("pipeDiameterMm")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Pump Eff. (%)</label>
                    <Input type="number" {...form.register("pumpEfficiencyPct")} className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="font-semibold mb-2">Solar Array Configuration</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="font-medium">kWp</label>
                    <Input type="number" step="0.5" {...form.register("capacityKwp")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Tilt (°)</label>
                    <Input type="number" {...form.register("tiltDeg")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Azimuth (°)</label>
                    <Input type="number" {...form.register("azimuthDeg")} className="mt-1" />
                  </div>
                  <div>
                    <label className="font-medium">Loss (%)</label>
                    <Input type="number" {...form.register("systemLossPct")} className="mt-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={isOnline ? "green" : "amber"}>
            {isOnline ? "Saves directly to server + IndexedDB" : "Offline: saves locally & queues sync"}
          </Badge>
          <Button type="submit" variant="primary" disabled={saveFarm.isPending}>
            <Save className="h-4 w-4" />
            {creatingNew ? "Create Property" : "Save Property Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
