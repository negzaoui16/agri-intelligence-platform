"use client";

import * as React from "react";
import {
  Check,
  Loader2,
  MapPin,
  Search,
  Sprout,
  Droplets,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  InteractiveFarmMap,
  type BaseLayerId,
} from "@/components/map/InteractiveFarmMap";
import {
  TUNISIA_GOVERNORATE_COORDS,
  WATER_SOURCE_OPTIONS,
} from "@/components/onboarding/TunisiaGeoHelper";
import { IRRIGATION_EFFICIENCY_DEFAULTS } from "@/lib/db/defaults";
import { CROP_DATABASE } from "@/lib/engines/fao56-calculator";
import type {
  FarmPin,
  FarmRecord,
  FarmerWaterSourceType,
  GeoPolygon,
  IrrigationMethod,
  PinRole,
  SoilTextureClass,
} from "@/types/agri";
import { cn } from "@/lib/utils";
import { FARM_UI_STRINGS, fillTemplate, localizeGovernorate } from "@/lib/i18n/farm-ui-strings";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface WizardSubmitPayload {
  farmId?: string;
  name: string;
  country: string;
  governorate: string;
  delegation: string;
  locality: string;
  centerLat: number;
  centerLon: number;
  areaHectares: number;
  perimeterMeters: number;
  boundary: GeoPolygon | null;
  pins: FarmPin[];
  cropCode: string;
  cropName: string;
  plantingMonth: number;
  soilTexture: SoilTextureClass;
  irrigationMethod: IrrigationMethod;
  waterSourceType: FarmerWaterSourceType;
  wellDepthM: number | null;
  hasPump: boolean;
  flowRateM3Hr: number;
  operatingHoursDay: number;
  staticHeadM: number;
  pumpEfficiencyPct: number;
  pipeLengthM: number;
  pipeDiameterMm: number;
  pumpIsEstimate: boolean;
  solarStatus: "YES" | "NO" | "PLANNING" | "NOT_SURE";
  capacityKwp: number;
  panelCount: number | null;
  tiltDeg: number;
  azimuthDeg: number;
  systemLossPct: number;
  solarIsEstimate: boolean;
}

interface Props {
  mode: "onboarding" | "farms";
  initialFarm?: FarmRecord | null;
  initialStep?: 1 | 2 | 3;
  onCancel?: () => void;
  onSaveStep?: (step: 1 | 2 | 3, draft: WizardSubmitPayload) => Promise<string | void>;
  onFinish: (draft: WizardSubmitPayload) => Promise<void>;
  submitting?: boolean;
  finishLabel?: string;
}

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
}

export function ThreeStepFarmWizard({
  mode,
  initialFarm,
  initialStep = 1,
  onCancel,
  onSaveStep,
  onFinish,
  submitting = false,
  finishLabel,
}: Props) {
  const { t, isRtl, cropLabel, lang, monthLabel } = useLanguage();
  const f = FARM_UI_STRINGS[lang];

  const [step, setStep] = React.useState<1 | 2 | 3>(initialStep);
  const [name, setName] = React.useState(initialFarm?.name || "My farm");
  const [country, setCountry] = React.useState(initialFarm?.country || "Tunisia");
  const [governorate, setGovernorate] = React.useState(initialFarm?.governorate || "Nabeul");
  const [delegation, setDelegation] = React.useState(initialFarm?.delegation || "");
  const [locality, setLocality] = React.useState(initialFarm?.locality || "");
  const [centerLat, setCenterLat] = React.useState(
    initialFarm?.centerLat ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LAT || 36.4561)
  );
  const [centerLon, setCenterLon] = React.useState(
    initialFarm?.centerLon ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LON || 10.7376)
  );
  const [areaHectares, setAreaHectares] = React.useState(initialFarm?.areaHectares ?? 4);
  const [perimeterMeters, setPerimeterMeters] = React.useState(
    initialFarm?.perimeterMeters ?? 800
  );
  const [boundary, setBoundary] = React.useState<GeoPolygon | null>(
    initialFarm?.boundary ?? null
  );
  const [pins, setPins] = React.useState<FarmPin[]>(initialFarm?.pins ?? []);

  // Step 2: Crops
  const [cropSearch, setCropSearch] = React.useState("");
  const [cropCode, setCropCode] = React.useState(
    initialFarm?.irrigationConfig.cropCode || "olive"
  );
  const [plantingMonth, setPlantingMonth] = React.useState(
    initialFarm?.irrigationConfig.plantingMonth ?? 3
  );
  const [soilTexture, setSoilTexture] = React.useState<SoilTextureClass>(
    initialFarm?.soilProfile.textureClass ?? "LOAM"
  );

  // Step 3: Water & Energy
  const [waterSourceType, setWaterSourceType] = React.useState<FarmerWaterSourceType>(
    initialFarm?.farmerWaterSources?.[0]?.sourceType ?? "WELL"
  );
  const [wellDepthStr, setWellDepthStr] = React.useState(
    initialFarm?.farmerWaterSources?.[0]?.wellDepthM
      ? String(initialFarm.farmerWaterSources[0].wellDepthM)
      : ""
  );
  const [irrigationMethod, setIrrigationMethod] = React.useState<IrrigationMethod>(
    initialFarm?.irrigationConfig.irrigationMethod ?? "DRIP"
  );
  const [hasPump, setHasPump] = React.useState(
    initialFarm?.pumpConfig.hasPump ?? true
  );
  const [flowRateStr, setFlowRateStr] = React.useState(
    initialFarm?.pumpConfig.isFarmerProvided !== false && initialFarm?.pumpConfig.flowRateM3Hr
      ? String(initialFarm.pumpConfig.flowRateM3Hr)
      : ""
  );
  const [hoursStr, setHoursStr] = React.useState(
    initialFarm?.pumpConfig.operatingHoursDay
      ? String(initialFarm.pumpConfig.operatingHoursDay)
      : ""
  );
  const [staticHeadStr, setStaticHeadStr] = React.useState(
    initialFarm?.pumpConfig.staticHeadM ? String(initialFarm.pumpConfig.staticHeadM) : ""
  );
  const [pumpEfficiencyStr, setPumpEfficiencyStr] = React.useState(
    initialFarm?.pumpConfig.pumpEfficiencyPct
      ? String(initialFarm.pumpConfig.pumpEfficiencyPct)
      : ""
  );
  const [pipeLengthStr, setPipeLengthStr] = React.useState(
    initialFarm?.pumpConfig.pipeLengthM ? String(initialFarm.pumpConfig.pipeLengthM) : ""
  );
  const [pipeDiameterStr, setPipeDiameterStr] = React.useState(
    initialFarm?.pumpConfig.pipeDiameterMm
      ? String(initialFarm.pumpConfig.pipeDiameterMm)
      : ""
  );

  const [solarStatus, setSolarStatus] = React.useState<"YES" | "NO" | "PLANNING" | "NOT_SURE">(
    initialFarm?.solarConfig.solarStatus ?? "PLANNING"
  );
  const [panelsStr, setPanelsStr] = React.useState(
    initialFarm?.solarConfig.panelCount
      ? String(initialFarm.solarConfig.panelCount)
      : initialFarm?.solarConfig.capacityKwp
        ? String(Math.round((initialFarm.solarConfig.capacityKwp * 1000) / 500))
        : ""
  );
  const [tiltStr, setTiltStr] = React.useState(
    initialFarm?.solarConfig.tiltDeg ? String(initialFarm.solarConfig.tiltDeg) : ""
  );
  const [azimuthStr, setAzimuthStr] = React.useState(
    initialFarm?.solarConfig.azimuthDeg !== undefined
      ? String(initialFarm.solarConfig.azimuthDeg)
      : "0"
  );
  const [systemLossStr, setSystemLossStr] = React.useState(
    initialFarm?.solarConfig.systemLossPct ? String(initialFarm.solarConfig.systemLossPct) : ""
  );

  // Map & search controls
  const [mapMode, setMapMode] = React.useState<"INSPECT" | "DROP_PIN" | "DRAW_BOUNDARY">(
    "INSPECT"
  );
  const [baseLayer, setBaseLayer] = React.useState<BaseLayerId>("satellite");
  const [villageQuery, setVillageQuery] = React.useState("");
  const [searchingVillage, setSearchingVillage] = React.useState(false);
  const [villageHits, setVillageHits] = React.useState<NominatimHit[]>([]);
  const [gpsStatus, setGpsStatus] = React.useState<string | null>(null);
  const [stepError, setStepError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  React.useEffect(() => {
    if (!initialFarm) return;
    setName(initialFarm.name);
    setCountry(initialFarm.country || "Tunisia");
    setGovernorate(initialFarm.governorate || "Nabeul");
    setDelegation(initialFarm.delegation || "");
    setLocality(initialFarm.locality || "");
    setCenterLat(initialFarm.centerLat);
    setCenterLon(initialFarm.centerLon);
    setAreaHectares(initialFarm.areaHectares);
    setPerimeterMeters(initialFarm.perimeterMeters);
    setBoundary(initialFarm.boundary ?? null);
    setPins(initialFarm.pins ?? []);
    setCropCode(initialFarm.irrigationConfig.cropCode);
    setPlantingMonth(initialFarm.irrigationConfig.plantingMonth);
    setSoilTexture(initialFarm.soilProfile.textureClass);
    setIrrigationMethod(initialFarm.irrigationConfig.irrigationMethod);
    setWaterSourceType(initialFarm.farmerWaterSources?.[0]?.sourceType ?? "WELL");
    setHasPump(initialFarm.pumpConfig.hasPump ?? true);
    setFlowRateStr(String(initialFarm.pumpConfig.flowRateM3Hr));
    setHoursStr(String(initialFarm.pumpConfig.operatingHoursDay));
    setStaticHeadStr(String(initialFarm.pumpConfig.staticHeadM));
    setPumpEfficiencyStr(String(initialFarm.pumpConfig.pumpEfficiencyPct));
    setPipeLengthStr(String(initialFarm.pumpConfig.pipeLengthM));
    setPipeDiameterStr(String(initialFarm.pumpConfig.pipeDiameterMm));
    setSolarStatus(initialFarm.solarConfig.solarStatus ?? "PLANNING");
    setPanelsStr(
      String(
        initialFarm.solarConfig.panelCount ??
          Math.max(1, Math.round((initialFarm.solarConfig.capacityKwp * 1000) / 500))
      )
    );
    setTiltStr(String(initialFarm.solarConfig.tiltDeg));
    setAzimuthStr(String(initialFarm.solarConfig.azimuthDeg));
    setSystemLossStr(String(initialFarm.solarConfig.systemLossPct));
  }, [initialFarm]);

  const buildPayload = (): WizardSubmitPayload => {
    const selectedCrop =
      CROP_DATABASE.find((c) => c.code === cropCode) ?? CROP_DATABASE[0];

    const flowParsed = Number(flowRateStr);
    const hoursParsed = Number(hoursStr);
    const staticParsed = Number(staticHeadStr);
    const effParsed = Number(pumpEfficiencyStr);
    const pipeLenParsed = Number(pipeLengthStr);
    const pipeDiaParsed = Number(pipeDiameterStr);
    const pumpIsEstimate = !flowRateStr.trim() || !Number.isFinite(flowParsed);

    const panelsParsed = Number(panelsStr);
    const solarIsEstimate = !panelsStr.trim() || !Number.isFinite(panelsParsed);
    const finalPanels = !solarIsEstimate && panelsParsed > 0 ? Math.round(panelsParsed) : 16;
    const capacityKwp = Number(((finalPanels * 500) / 1000).toFixed(2));
    const tiltParsed = Number(tiltStr);
    const azParsed = Number(azimuthStr);
    const lossParsed = Number(systemLossStr);
    const depthParsed = Number(wellDepthStr);

    return {
      farmId: initialFarm?.id,
      name: name.trim() || "My farm",
      country: country.trim() || "Tunisia",
      governorate,
      delegation: delegation.trim(),
      locality: locality.trim(),
      centerLat,
      centerLon,
      areaHectares: Number.isFinite(areaHectares) && areaHectares > 0 ? areaHectares : 4,
      perimeterMeters:
        Number.isFinite(perimeterMeters) && perimeterMeters > 0 ? perimeterMeters : 800,
      boundary,
      pins,
      cropCode: selectedCrop.code,
      cropName: selectedCrop.name,
      plantingMonth,
      soilTexture,
      irrigationMethod,
      waterSourceType,
      wellDepthM: wellDepthStr.trim() && Number.isFinite(depthParsed) ? depthParsed : null,
      hasPump,
      flowRateM3Hr: !pumpIsEstimate && flowParsed > 0 ? flowParsed : 20,
      operatingHoursDay: hoursStr.trim() && Number.isFinite(hoursParsed) && hoursParsed > 0 ? hoursParsed : 6,
      staticHeadM: staticHeadStr.trim() && Number.isFinite(staticParsed) && staticParsed >= 0 ? staticParsed : 18,
      pumpEfficiencyPct: effParsed >= 20 && effParsed <= 90 ? effParsed : 65,
      pipeLengthM: pipeLenParsed >= 1 ? pipeLenParsed : 180,
      pipeDiameterMm: pipeDiaParsed >= 20 ? pipeDiaParsed : 75,
      pumpIsEstimate,
      solarStatus,
      capacityKwp,
      panelCount: finalPanels,
      tiltDeg: tiltStr.trim() && Number.isFinite(tiltParsed) ? tiltParsed : Math.round(Math.abs(centerLat) * 0.87),
      azimuthDeg: azimuthStr.trim() && Number.isFinite(azParsed) ? azParsed : 0,
      systemLossPct: lossParsed >= 1 && lossParsed <= 50 ? lossParsed : 14,
      solarIsEstimate,
    };
  };

  const handleUseMyLocation = () => {
    setGpsStatus(f.gpsFinding);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus(f.gpsUnavailable);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setCenterLat(lat);
        setCenterLon(lon);
        setPins([
          {
            id: `pin_gps_${Date.now()}`,
            farmId: initialFarm?.id ?? "draft",
            label: "Farm center",
            role: "FIELD_CENTER",
            latitude: lat,
            longitude: lon,
            elevationM: null,
            createdAt: new Date().toISOString(),
          },
        ]);
        setGpsStatus(f.gpsFound);
      },
      () => {
        setGpsStatus(f.gpsFailed);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const handleVillageSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = villageQuery.trim();
    if (!q) return;
    setSearchingVillage(true);
    setGpsStatus(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const hits = (await res.json()) as NominatimHit[];
        setVillageHits(hits);
        if (hits[0]) {
          const lat = Number(hits[0].lat);
          const lon = Number(hits[0].lon);
          setCenterLat(lat);
          setCenterLon(lon);
          setLocality(q);
          if (!name.trim() || name === "My farm") {
            setName(`${q} farm`);
          }
        }
      }
    } catch {
      // ignore offline village lookup error
    } finally {
      setSearchingVillage(false);
    }
  };

  const goNext = async (targetStep: 2 | 3) => {
    setStepError(null);
    if (step === 1) {
      if (!name.trim() || name.trim().length < 2) {
        setStepError("Give your farm a short name (at least 2 letters).");
        return;
      }
      if (!Number.isFinite(areaHectares) || areaHectares <= 0) {
        setStepError("Enter a valid farm area in hectares.");
        return;
      }
    }
    const payload = buildPayload();
    if (onSaveStep) {
      await onSaveStep(step, payload);
    }
    setStep(targetStep);
  };

  const handleComplete = async () => {
    setStepError(null);
    const payload = buildPayload();
    await onFinish(payload);
  };

  const filteredCrops = CROP_DATABASE.filter((c) => {
    if (!cropSearch.trim()) return true;
    const q = cropSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      cropLabel(c.name, c.code).toLowerCase().includes(q)
    );
  });

  const stepItems = [
    { num: 1 as const, title: t.step1Where, sub: t.step1WhereSub },
    { num: 2 as const, title: t.step2WhatGrow, sub: t.step2WhatGrowSub },
    { num: 3 as const, title: t.step3Water, sub: t.step3WaterSub },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Steps indicator: horizontal progress on phone, vertical numbered cards on desktop */}
      <ol
        aria-label="Steps"
        className="w-full lg:w-[240px] lg:shrink-0 list-none m-0 p-0 grid grid-cols-3 lg:flex lg:flex-col gap-2 lg:gap-2.5"
      >
        {stepItems.map((s) => {
          const active = step === s.num;
          const done = step > s.num;
          return (
            <li key={s.num}>
              <button
                type="button"
                onClick={() => setStep(s.num)}
                className={cn(
                  "w-full text-start rounded-[14px] lg:rounded-[16px] p-2.5 lg:px-4 lg:py-3.5 transition-colors flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3",
                  active
                    ? "bg-[var(--tp-bg-FFFFFF)] border-2 border-[var(--tp-bd-2E6B3A)]"
                    : "bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)]"
                )}
              >
                <span
                  className={cn(
                    "hidden lg:flex w-[34px] h-[34px] rounded-full font-bold items-center justify-center shrink-0",
                    active
                      ? "bg-[var(--tp-bg-2E6B3A)] text-white"
                      : done
                        ? "bg-[var(--tp-bg-E3EFE2)] text-[var(--tp-fg-2E6B3A)]"
                        : "bg-[var(--tp-bg-EFEBE1)] text-[var(--tp-fg-4A5A4F)]"
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : s.num}
                </span>
                <span
                  className={cn(
                    "lg:hidden h-[6px] w-full rounded-full block",
                    active || done ? "bg-[var(--tp-bg-2E6B3A)]" : "bg-[var(--tp-bg-D9D3C3)]"
                  )}
                />
                <span className="flex flex-col min-w-0">
                  <b
                    className={cn(
                      "text-[14px] lg:text-[18px] leading-tight",
                      active ? "text-[var(--tp-fg-2E6B3A)] lg:text-[var(--tp-fg-17251C)]" : "text-[var(--tp-fg-4A5A4F)]"
                    )}
                  >
                    <span className="lg:hidden">{s.num} · </span>
                    {s.title}
                  </b>
                  <span className="hidden lg:block text-[14px] text-[var(--tp-fg-4A5A4F)]">
                    {s.sub}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Active Step Card matching AddFarm.dc.html / DeskAddFarm.dc.html */}
      <section className="flex-1 min-w-0 w-full bg-[var(--tp-bg-FFFFFF)] border-[1.5px] border-[var(--tp-bd-E4DFD2)] rounded-[22px] p-5 lg:p-6 flex flex-col gap-4.5">
        {stepError && (
          <div className="bg-[var(--tp-bg-FCEFD9)] border-2 border-[var(--tp-bd-E2B66B)] text-[var(--tp-fg-6B3A00)] rounded-[14px] px-4 py-3 text-[16px] font-bold">
            {stepError}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[26px] font-bold text-[var(--tp-fg-17251C)]">
                {t.whereIsYourFarm}
              </h2>
              <p className="m-0 text-[17px] text-[var(--tp-fg-4A5A4F)] leading-[1.45]">
                {t.standOnLandHint}
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-3.5 lg:items-end">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="flex-1 min-h-[60px] rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[18px] lg:text-[19px] font-bold px-5 flex items-center justify-center gap-2.5 hover:bg-[var(--tp-bg-23542D)]"
              >
                <MapPin className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span className="lg:hidden">{t.iAmOnMyFarmNow}</span>
                <span className="hidden lg:inline">{t.useMyLocation}</span>
              </button>

              <div className="lg:hidden flex items-center gap-2.5 text-[var(--tp-fg-4A5A4F)] text-[15px]">
                <span className="flex-1 h-[1.5px] bg-[var(--tp-bg-D9D3C3)]" />
                <span>or</span>
                <span className="flex-1 h-[1.5px] bg-[var(--tp-bg-D9D3C3)]" />
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <label htmlFor="village-search" className="text-[16px] lg:text-[17px] font-bold">
                  {t.nearestVillageOrTown}
                </label>
                <div className="flex gap-2">
                  <input
                    id="village-search"
                    type="text"
                    value={villageQuery}
                    onChange={(e) => setVillageQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleVillageSearch();
                      }
                    }}
                    placeholder={t.villagePlaceholder}
                    className="flex-1 min-w-0 min-h-[52px] rounded-[14px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-4 text-[17px] text-[var(--tp-fg-17251C)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleVillageSearch()}
                    disabled={searchingVillage}
                    aria-label={f.searchVillage}
                    className="min-h-[52px] px-4 rounded-[14px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-F6F4EE)] text-[var(--tp-fg-17251C)] font-bold flex items-center justify-center"
                  >
                    {searchingVillage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {gpsStatus && (
              <p className="m-0 text-[15px] font-bold text-[var(--tp-fg-1F4D28)] bg-[var(--tp-bg-E3EFE2)] rounded-[12px] px-4 py-2.5">
                {gpsStatus}
              </p>
            )}

            {villageHits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {villageHits.map((hit, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCenterLat(Number(hit.lat));
                      setCenterLon(Number(hit.lon));
                      setLocality(hit.display_name.split(",")[0] ?? "");
                      setVillageHits([]);
                    }}
                    className="min-h-[44px] px-3.5 rounded-full border border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-F6F4EE)] text-[14px] text-[var(--tp-fg-17251C)]"
                  >
                    {hit.display_name.split(",").slice(0, 2).join(", ")}
                  </button>
                ))}
              </div>
            )}

            {/* Farm Name, Governorate, Area (with step="any"!) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="farm-name" className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  {f.farmName}
                </label>
                <input
                  id="farm-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="farm-area" className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  {f.sizeHectares}
                </label>
                <input
                  id="farm-area"
                  type="number"
                  step="any"
                  min="0.01"
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(Number(e.target.value) || 0)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="farm-gov" className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  {f.regionGovernorate}
                </label>
                <select
                  id="farm-gov"
                  value={governorate}
                  onChange={(e) => {
                    const nextGov = e.target.value;
                    setGovernorate(nextGov);
                    const coord = TUNISIA_GOVERNORATE_COORDS.find((g) => g.name === nextGov);
                    if (coord && !initialFarm) {
                      setCenterLat(coord.lat);
                      setCenterLon(coord.lon);
                    }
                  }}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  {TUNISIA_GOVERNORATE_COORDS.map((g) => (
                    <option key={g.name} value={g.name}>
                      {localizeGovernorate(g.name, lang)}
                    </option>
                  ))}
                  <option value="Other">{f.otherRegion}</option>
                </select>
              </div>
            </div>

            {/* Interactive Farm Map reused cleanly */}
            <figure className="m-0 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMapMode(mapMode === "DROP_PIN" ? "INSPECT" : "DROP_PIN")}
                  className={cn(
                    "min-h-[44px] px-4 rounded-full border-[1.5px] text-[15px] font-bold",
                    mapMode === "DROP_PIN"
                      ? "bg-[var(--tp-bg-2E6B3A)] text-white border-[var(--tp-bd-2E6B3A)]"
                      : "bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] border-[var(--tp-bd-B8B1A0)]"
                  )}
                >
                  {mapMode === "DROP_PIN" ? f.tapMapToSetSpot : f.movePinOnMap}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMapMode(mapMode === "DRAW_BOUNDARY" ? "INSPECT" : "DRAW_BOUNDARY")
                  }
                  className={cn(
                    "min-h-[44px] px-4 rounded-full border-[1.5px] text-[15px] font-bold",
                    mapMode === "DRAW_BOUNDARY"
                      ? "bg-[var(--tp-bg-2E6B3A)] text-white border-[var(--tp-bd-2E6B3A)]"
                      : "bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] border-[var(--tp-bd-B8B1A0)]"
                  )}
                >
                  {mapMode === "DRAW_BOUNDARY" ? f.tapCornersOnMap : f.drawLandShape}
                </button>
              </div>

              <div className="h-[260px] lg:h-[360px] rounded-[18px] overflow-hidden border-[1.5px] border-[var(--tp-bd-E4DFD2)]">
                <InteractiveFarmMap
                  centerLat={centerLat}
                  centerLon={centerLon}
                  boundary={boundary}
                  pins={pins}
                  mode={mapMode}
                  activePinRole="FIELD_CENTER"
                  showWaterOverlay={false}
                  showWeatherOverlay={false}
                  baseLayer={baseLayer}
                  onModeChange={setMapMode}
                  onBaseLayerChange={setBaseLayer}
                  onAddPin={(lat, lon, role: PinRole) => {
                    setCenterLat(lat);
                    setCenterLon(lon);
                    setPins((prev) => [
                      ...prev.filter((p) => p.role !== "FIELD_CENTER"),
                      {
                        id: `pin_${Date.now()}`,
                        farmId: initialFarm?.id ?? "draft",
                        label: name || f.farmCenterPin,
                        role,
                        latitude: lat,
                        longitude: lon,
                        elevationM: null,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                  }}
                  onBoundaryChange={(nextBoundary, nextArea, nextPerim) => {
                    setBoundary(nextBoundary);
                    if (nextArea > 0) setAreaHectares(Number(nextArea.toFixed(4)));
                    if (nextPerim > 0) setPerimeterMeters(Math.round(nextPerim));
                  }}
                />
              </div>

              <figcaption className="bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--tp-fg-17251C)]">
                {fillTemplate(f.yourFarmAbout, {
                  area: `${Number(areaHectares.toFixed(1))} ${t.hectaresFull}`,
                })}{" "}
                <span className="text-[var(--tp-fg-4A5A4F)]">{f.optional}</span>
              </figcaption>
            </figure>

            {/* Collapsed optional exact coordinates with step="any" */}
            <details className="text-[15px] text-[var(--tp-fg-4A5A4F)]">
              <summary className="min-h-[44px] flex items-center cursor-pointer font-bold text-[var(--tp-fg-1D4F91)]">
                {t.skipIfDontKnow}: {f.typeGpsOrCountry}
              </summary>
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-[var(--tp-fg-17251C)]">
                  <span className="font-bold">{f.latitude}</span>
                  <input
                    type="number"
                    step="any"
                    value={centerLat}
                    onChange={(e) => setCenterLat(Number(e.target.value) || 0)}
                    className="min-h-[44px] rounded-[12px] border border-[var(--tp-bd-B8B1A0)] px-3 text-[16px]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[var(--tp-fg-17251C)]">
                  <span className="font-bold">{f.longitude}</span>
                  <input
                    type="number"
                    step="any"
                    value={centerLon}
                    onChange={(e) => setCenterLon(Number(e.target.value) || 0)}
                    className="min-h-[44px] rounded-[12px] border border-[var(--tp-bd-B8B1A0)] px-3 text-[16px]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[var(--tp-fg-17251C)]">
                  <span className="font-bold">{f.country}</span>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="min-h-[44px] rounded-[12px] border border-[var(--tp-bd-B8B1A0)] px-3 text-[16px]"
                  />
                </label>
              </div>
            </details>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-[54px] px-6 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[17px] font-bold text-[var(--tp-fg-17251C)]"
                >
                  {mode === "onboarding" ? f.later : f.cancel}
                </button>
              )}
              <button
                type="button"
                onClick={() => goNext(2)}
                className="min-h-[54px] px-7 rounded-full bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] text-[17px] font-bold inline-flex items-center gap-2"
              >
                <span>{fillTemplate(f.nextStep, { step: t.step2WhatGrow })}</span>
                <ChevronRight className={cn("w-5 h-5", isRtl && "rotate-180")} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2.5">
              <Sprout className="w-7 h-7 text-[var(--tp-fg-2E6B3A)]" />
              <h2 className="m-0 text-[26px] font-bold text-[var(--tp-fg-17251C)]">
                {f.whatDoYouGrow}
              </h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="crop-filter" className="text-[16px] font-bold">
                {f.findMainCrop}
              </label>
              <input
                id="crop-filter"
                type="text"
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                placeholder={f.cropSearchPlaceholder}
                className="min-h-[52px] rounded-[14px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] px-4 text-[17px]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredCrops.map((crop) => {
                const selected = crop.code === cropCode;
                return (
                  <button
                    key={crop.code}
                    type="button"
                    onClick={() => setCropCode(crop.code)}
                    className={cn(
                      "min-h-[52px] rounded-[14px] px-3.5 py-2.5 text-start border-[1.5px] transition-colors flex flex-col gap-0.5",
                      selected
                        ? "bg-[var(--tp-bg-E3EFE2)] border-2 border-[var(--tp-bd-2E6B3A)] text-[var(--tp-fg-1F4D28)]"
                        : "bg-[var(--tp-bg-FFFFFF)] border-[var(--tp-bd-E4DFD2)] text-[var(--tp-fg-17251C)] hover:bg-[var(--tp-bg-F6F4EE)]"
                    )}
                  >
                    <b className="text-[16px]">{cropLabel(crop.name, crop.code)}</b>
                    <span className="text-[13px] text-[var(--tp-fg-4A5A4F)]">
                      {crop.droughtTolerance === "High"
                        ? f.droughtHigh
                        : crop.droughtTolerance === "Moderate"
                          ? f.droughtModerate
                          : f.droughtLow}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex flex-col gap-1">
                <span className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  {f.plantingStartMonth}
                </span>
                <select
                  value={plantingMonth}
                  onChange={(e) => setPlantingMonth(Number(e.target.value))}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  {Array.from({ length: 12 }, (_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {monthLabel(MONTH_NAMES[idx])}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[15px] font-bold text-[var(--tp-fg-17251C)]">
                  {f.soilFeel} ({t.skipIfDontKnow})
                </span>
                <select
                  value={soilTexture}
                  onChange={(e) => setSoilTexture(e.target.value as SoilTextureClass)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  <option value="SANDY">{f.soilSandy}</option>
                  <option value="SANDY_LOAM">{f.soilSandyLoam}</option>
                  <option value="LOAM">{f.soilLoam} ({t.ourEstimateBadge})</option>
                  <option value="SILT_LOAM">{f.soilSiltLoam}</option>
                  <option value="CLAY_LOAM">{f.soilClayLoam}</option>
                  <option value="CLAY">{f.soilClay}</option>
                </select>
              </label>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[54px] px-6 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[17px] font-bold inline-flex items-center gap-2"
              >
                <ChevronLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
                <span>{f.back}</span>
              </button>
              <button
                type="button"
                onClick={() => goNext(3)}
                className="min-h-[54px] px-7 rounded-full bg-[var(--tp-bg-17251C)] text-[var(--tp-on-inverse)] text-[17px] font-bold inline-flex items-center gap-2"
              >
                <span>{fillTemplate(f.nextStep, { step: t.step3Water })}</span>
                <ChevronRight className={cn("w-5 h-5", isRtl && "rotate-180")} />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2.5">
              <Droplets className="w-7 h-7 text-[var(--tp-fg-1D4F91)]" />
              <div className="flex flex-col">
                <h2 className="m-0 text-[26px] font-bold text-[var(--tp-fg-17251C)]">
                  {f.waterPumpPanels}
                </h2>
                <span className="text-[15px] text-[var(--tp-fg-4A5A4F)]">
                  {t.skipIfDontKnow} {fillTemplate(f.weFillSafeValues, { estimate: t.ourEstimateBadge })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">{f.mainWaterSource}</span>
                <select
                  value={waterSourceType}
                  onChange={(e) => setWaterSourceType(e.target.value as FarmerWaterSourceType)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  {WATER_SOURCE_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {f.waterSources[w.value] ?? w.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Single source of truth: reads directly from IRRIGATION_EFFICIENCY_DEFAULTS */}
              <label className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">{f.howYouWater}</span>
                <select
                  value={irrigationMethod}
                  onChange={(e) => setIrrigationMethod(e.target.value as IrrigationMethod)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3 text-[16px]"
                >
                  {(
                    Object.entries(IRRIGATION_EFFICIENCY_DEFAULTS) as Array<
                      [IrrigationMethod, (typeof IRRIGATION_EFFICIENCY_DEFAULTS)[IrrigationMethod]]
                    >
                  ).map(([key, spec]) => (
                    <option key={key} value={key}>
                      {f.wateringMethods[key] ?? spec.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Pump Simple Questions */}
            <div className="bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] rounded-[16px] p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-[17px]">{f.haveAPump}</b>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasPump(true)}
                    className={cn(
                      "min-h-[44px] px-4 rounded-full font-bold text-[15px] border",
                      hasPump
                        ? "bg-[var(--tp-bg-2E6B3A)] text-white border-[var(--tp-bd-2E6B3A)]"
                        : "bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] border-[var(--tp-bd-B8B1A0)]"
                    )}
                  >
                    {f.yes}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasPump(false)}
                    className={cn(
                      "min-h-[44px] px-4 rounded-full font-bold text-[15px] border",
                      !hasPump
                        ? "bg-[var(--tp-bg-2E6B3A)] text-white border-[var(--tp-bd-2E6B3A)]"
                        : "bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] border-[var(--tp-bd-B8B1A0)]"
                    )}
                  >
                    {f.noOrPlanning}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold">
                    {f.pumpPerHour} — {t.skipIfDontKnow}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`20 (${t.ourEstimateBadge})`}
                    value={flowRateStr}
                    onChange={(e) => setFlowRateStr(e.target.value)}
                    className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px]"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold">
                    {f.hoursPerDay} — {t.skipIfDontKnow}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`6 (${t.ourEstimateBadge})`}
                    value={hoursStr}
                    onChange={(e) => setHoursStr(e.target.value)}
                    className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px]"
                  />
                </label>
              </div>
            </div>

            {/* Solar Simple Questions */}
            <div className="bg-[var(--tp-bg-F6F4EE)] border border-[var(--tp-bd-E4DFD2)] rounded-[16px] p-4 flex flex-col gap-3">
              <b className="text-[17px]">{f.haveSolar}</b>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { value: "YES", label: f.solarYes },
                    { value: "PLANNING", label: f.solarPlanning },
                    { value: "NO", label: f.solarNo },
                    { value: "NOT_SURE", label: f.solarNotSure },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSolarStatus(opt.value)}
                    className={cn(
                      "min-h-[44px] px-3 rounded-[12px] text-[14px] font-bold border",
                      solarStatus === opt.value
                        ? "bg-[var(--tp-bg-2E6B3A)] text-white border-[var(--tp-bd-2E6B3A)]"
                        : "bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)] border-[var(--tp-bd-B8B1A0)]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">
                  {f.panelCount} — {t.skipIfDontKnow}
                </span>
                <input
                  type="number"
                  step="1"
                  placeholder={`16 (${t.ourEstimateBadge})`}
                  value={panelsStr}
                  onChange={(e) => setPanelsStr(e.target.value)}
                  className="min-h-[48px] rounded-[12px] border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] px-3.5 text-[16px]"
                />
              </label>
            </div>

            {/* Collapsed Advanced Settings ("Skip if you don't know") */}
            <details className="bg-[var(--tp-bg-FFFFFF)] border border-[var(--tp-bd-E4DFD2)] rounded-[16px] px-4 py-1">
              <summary className="min-h-[48px] flex items-center cursor-pointer text-[16px] font-bold text-[var(--tp-fg-1D4F91)]">
                {t.skipIfDontKnow}: {f.advancedSummary}
              </summary>
              <div className="pb-4 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[15px]">
                <label className="flex flex-col gap-1">
                  <span>{f.wellDepth}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={t.ourEstimateBadge}
                    value={wellDepthStr}
                    onChange={(e) => setWellDepthStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.liftHeight}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`18 (${t.ourEstimateBadge})`}
                    value={staticHeadStr}
                    onChange={(e) => setStaticHeadStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.pipeLength}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`180 (${t.ourEstimateBadge})`}
                    value={pipeLengthStr}
                    onChange={(e) => setPipeLengthStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.pipeSize}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`75 (${t.ourEstimateBadge})`}
                    value={pipeDiameterStr}
                    onChange={(e) => setPipeDiameterStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.pumpEfficiency}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`65 (${t.ourEstimateBadge})`}
                    value={pumpEfficiencyStr}
                    onChange={(e) => setPumpEfficiencyStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.panelTilt}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={t.ourEstimateBadge}
                    value={tiltStr}
                    onChange={(e) => setTiltStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.panelDirection}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={f.southHint}
                    value={azimuthStr}
                    onChange={(e) => setAzimuthStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{f.systemLoss}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={`14 (${t.ourEstimateBadge})`}
                    value={systemLossStr}
                    onChange={(e) => setSystemLossStr(e.target.value)}
                    className="min-h-[44px] rounded-[10px] border border-[var(--tp-bd-B8B1A0)] px-3"
                  />
                </label>
              </div>
            </details>

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[54px] px-6 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[17px] font-bold inline-flex items-center gap-2"
              >
                <ChevronLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
                <span>{f.back}</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleComplete}
                className="min-h-[56px] px-8 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[17px] font-bold inline-flex items-center gap-2 hover:bg-[var(--tp-bg-23542D)]"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{finishLabel ?? t.saveFarmBtn}</span>
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
