"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  InteractiveFarmMap,
  type BaseLayerId,
} from "@/components/map/InteractiveFarmMap";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { FARM_UI_STRINGS, fillTemplate } from "@/lib/i18n/farm-ui-strings";
import { localizeWaterSource } from "@/lib/i18n/translations";
import {
  useFarmAnalysis,
  useFarms,
  useRefreshFarmAnalysis,
  useSaveFarm,
} from "@/hooks/useFarms";
import { useAppStore } from "@/lib/store/app-store";
import { cn, formatDistance } from "@/lib/utils";
import type { FarmPin, FarmRecord, GeoPolygon, PinRole } from "@/types/agri";
import {
  CloudRain,
  Droplets,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

export default function MapPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const f = FARM_UI_STRINGS[lang];
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
      label: `${f.pinRoles[role] ?? role} ${activeFarm.pins.length + 1}`,
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
          label: f.pinRoles.FIELD_CENTER,
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

  const nearest = analysis?.waterSources.nearestSource ?? null;
  const nearestPlace = nearest
    ? localizeWaterSource(nearest.name, nearest.sourceType, lang)
    : null;
  const nearestHeight = (() => {
    const diff = nearest?.elevationDiffFromFarmM;
    if (diff === null || diff === undefined || !Number.isFinite(diff)) return null;
    const m = Math.round(Math.abs(diff));
    if (m <= 10) return f.heightEasy;
    return diff < 0 ? fillTemplate(f.heightLower, { m }) : fillTemplate(f.heightHigher, { m });
  })();

  const toggleClass = (on: boolean) =>
    cn(
      "min-h-[44px] px-4 rounded-full border-[1.5px] text-[15px] font-bold inline-flex items-center gap-2 transition-colors",
      on
        ? "bg-[var(--tp-bg-2E6B3A)] text-white border-[var(--tp-bd-2E6B3A)]"
        : "bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] border-[var(--tp-bd-B8B1A0)] hover:bg-[var(--tp-bg-F6F4EE)]"
    );
  const card =
    "bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[20px] p-4 lg:p-5";
  const fieldClass =
    "min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px] text-[var(--tp-fg-17251C)]";

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <FarmerPageHeader
        mobileLabel={t.navMyFarm}
        title={f.mapTitle}
        subtitle={f.mapSubtitle}
        backHref="/farms"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={showWaterOverlay}
          onClick={() => setShowWaterOverlay((v) => !v)}
          className={toggleClass(showWaterOverlay)}
        >
          <Droplets className="w-4 h-4" aria-hidden="true" />
          {f.waterNearMe}
        </button>
        <button
          type="button"
          aria-pressed={showWeatherOverlay}
          onClick={() => setShowWeatherOverlay((v) => !v)}
          className={toggleClass(showWeatherOverlay)}
        >
          <CloudRain className="w-4 h-4" aria-hidden="true" />
          {f.rainRadar}
        </button>
        {activeFarm && (
          <button
            type="button"
            disabled={!isOnline || refreshAnalysis.isPending}
            onClick={() => refreshAnalysis.mutate(activeFarm.id)}
            className={cn(toggleClass(false), "disabled:opacity-50")}
          >
            <RefreshCw
              className={cn("w-4 h-4", refreshAnalysis.isPending && "animate-spin")}
              aria-hidden="true"
            />
            {f.refreshFarmData}
          </button>
        )}
      </div>

      <section className={cn(card, "flex flex-col gap-2")}>
        <label htmlFor="pin-role" className="text-[16px] font-bold text-[var(--tp-fg-17251C)]">
          {f.whatToMark}
        </label>
        <select
          id="pin-role"
          value={pinRole}
          onChange={(e) => setPinRole(e.target.value as PinRole)}
          className={cn(fieldClass, "max-w-[360px]")}
        >
          {(["FIELD_CENTER", "WELL_CANDIDATE", "SOLAR_ARRAY", "PUMP_INTAKE", "SOIL_SAMPLE", "CUSTOM"] as PinRole[]).map(
            (role) => (
              <option key={role} value={role}>
                {f.pinRoles[role]}
              </option>
            )
          )}
        </select>
        <span className="text-[14px] text-[var(--tp-fg-4A5A4F)]">{f.marksHint}</span>
      </section>

      <div className="h-[420px] lg:h-[520px] rounded-[20px] overflow-hidden border-[1.5px] border-[var(--tp-bd-E4DFD2)]">
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
            setNewLat(lat.toFixed(5));
            setNewLon(lon.toFixed(5));
          }}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch">
        <section className={cn(card, "lg:flex-[1_1_320px] flex flex-col gap-3")}>
          <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)]">{f.yourLand}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[16px]">
            <dt className="text-[var(--tp-fg-4A5A4F)]">{f.landSize}</dt>
            <dd className="m-0 font-bold text-[var(--tp-fg-17251C)]">
              {activeFarm ? `${Number(activeFarm.areaHectares.toFixed(2))} ${t.hectaresFull}` : "—"}
            </dd>
            <dt className="text-[var(--tp-fg-4A5A4F)]">{f.edgeLength}</dt>
            <dd className="m-0 font-bold text-[var(--tp-fg-17251C)]">
              {activeFarm ? `${Math.round(activeFarm.perimeterMeters)} m` : "—"}
            </dd>
            <dt className="text-[var(--tp-fg-4A5A4F)]">{f.heightAboveSea}</dt>
            <dd className="m-0 font-bold text-[var(--tp-fg-17251C)]">
              {analysis?.elevation.farmElevationM ?? activeFarm?.elevationM ?? "—"} m
            </dd>
          </dl>

          {nearest && nearestPlace && (
            <div className="rounded-[14px] bg-[var(--tp-bg-E6EEF9)] px-3.5 py-3 flex flex-col gap-1 text-[15px]">
              <span className="font-bold text-[var(--tp-fg-1D4F91)]">{f.nearestWater}</span>
              <span className="text-[var(--tp-fg-17251C)]">
                <b>{nearestPlace.title}</b> · {fillTemplate(f.fromYourField, { dist: formatDistance(nearest.distanceFromBoundaryM) })}
              </span>
              {nearestHeight && <span className="text-[var(--tp-fg-4A5A4F)]">{nearestHeight}</span>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-auto pt-1">
            <button type="button" onClick={() => router.push("/water")} className={toggleClass(false)}>
              {f.checkMyWater}
            </button>
            <button type="button" onClick={() => router.push("/reports")} className={toggleClass(true)}>
              {f.farmReport}
            </button>
          </div>
        </section>

        <section className={cn(card, "lg:flex-[2_1_480px] min-w-0 flex flex-col gap-3")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-[19px] font-bold text-[var(--tp-fg-17251C)] inline-flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--tp-fg-2E6B3A)]" aria-hidden="true" />
              {fillTemplate(f.marksOnFarm, {
                farm: activeFarm?.name ?? t.navMyFarm,
                n: activeFarm?.pins.length ?? 0,
              })}
            </h2>
          </div>
          {!activeFarm || activeFarm.pins.length === 0 ? (
            <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">{f.noMarksYet}</p>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-col gap-2 max-h-72 overflow-y-auto">
              {activeFarm.pins.map((pin) => (
                <li
                  key={pin.id}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--tp-bd-E4DFD2)] px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex flex-col">
                    <b className="text-[16px] text-[var(--tp-fg-17251C)] truncate">{pin.label}</b>
                    <span className="text-[14px] text-[var(--tp-fg-2E6B3A)] font-bold">
                      {f.pinRoles[pin.role] ?? pin.role}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeletePin(pin.id)}
                    aria-label={fillTemplate(f.removeMark, { label: pin.label })}
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[var(--tp-fg-8A4B00)] hover:bg-[var(--tp-bg-FCEFD9)]"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <details className={cn(card, "py-1")}>
        <summary className="min-h-[48px] flex items-center cursor-pointer text-[16px] font-bold text-[var(--tp-fg-1D4F91)]">
          {f.addAnotherFarm}
        </summary>
        <div className="pb-3 pt-1 flex flex-col gap-3">
          <p className="m-0 text-[15px] text-[var(--tp-fg-4A5A4F)]">{f.addFarmHint}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 flex-[1_1_240px]">
              <span className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">{f.farmName}</span>
              <input
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                placeholder={f.farmNamePlaceholder}
                className={fieldClass}
              />
            </label>
            <button
              type="button"
              onClick={handleCreatePropertyAtCoords}
              disabled={saveFarm.isPending || !newLat || !newLon}
              className={cn(toggleClass(true), "min-h-[48px] disabled:opacity-50")}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {f.addFarmHere}
            </button>
          </div>
          {newLat && newLon && (
            <span className="text-[14px] text-[var(--tp-fg-4A5A4F)]">
              {fillTemplate(f.chosenSpot, { lat: newLat, lon: newLon })}
            </span>
          )}
        </div>
      </details>
    </div>
  );
}
