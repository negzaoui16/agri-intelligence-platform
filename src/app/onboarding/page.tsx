"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InteractiveFarmMap, type BaseLayerId } from "@/components/map/InteractiveFarmMap";
import {
  ACTIVITY_OPTIONS,
  EXPERIENCE_OPTIONS,
  IRRIGATION_SYSTEM_OPTIONS,
  TUNISIA_GOVERNORATE_COORDS,
  WATER_SOURCE_OPTIONS,
} from "@/components/onboarding/TunisiaGeoHelper";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from "@/components/ui/primitives";
import { useAuthSession } from "@/hooks/useAuth";
import { CROP_DATABASE } from "@/lib/engines/fao56-calculator";
import { saveOnboardingOffline } from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import type {
  FarmerActivityType,
  FarmerExperienceLevel,
  FarmerProfileRecord,
  FarmerWaterSourceRecord,
  FarmerWaterSourceType,
  FarmCropRecord,
  FarmPin,
  FarmRecord,
  GeoPolygon,
  IrrigationMethod,
  OnboardingProgressRecord,
  PinRole,
  SolarOwnershipStatus,
} from "@/types/agri";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Droplets,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Search,
  Sprout,
  Sun,
  Trash2,
  User,
} from "lucide-react";

const STAGE_META = [
  { step: 1, title: "Farmer Profile", icon: User },
  { step: 2, title: "Your Farm", icon: Compass },
  { step: 3, title: "Crops", icon: Sprout },
  { step: 4, title: "Water & Pump", icon: Droplets },
  { step: 5, title: "Solar Energy", icon: Sun },
  { step: 6, title: "Confirm", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuthSession();
  const isOnline = useAppStore((s) => s.isOnline);
  const setActiveFarmId = useAppStore((s) => s.setActiveFarmId);

  const [loaded, setLoaded] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [autosaveStatus, setAutosaveStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Stage 1 — Farmer Profile State
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [country, setCountry] = React.useState("Tunisia");
  const [governorate, setGovernorate] = React.useState("Nabeul");
  const [delegation, setDelegation] = React.useState("");
  const [locality, setLocality] = React.useState("");
  const [preferredLanguage, setPreferredLanguage] = React.useState<"en" | "fr" | "ar">("en");
  const [preferredUnits, setPreferredUnits] = React.useState<"metric" | "sqm">("metric");
  const [experienceLevel, setExperienceLevel] =
    React.useState<FarmerExperienceLevel>("YEARS_2_5");
  const [activityType, setActivityType] =
    React.useState<FarmerActivityType>("SMALL_FAMILY_FARM");

  // Stage 2 — Farm & Map State
  const [farmId, setFarmId] = React.useState<string | undefined>(undefined);
  const [farmName, setFarmName] = React.useState("");
  const [farmDesc, setFarmDesc] = React.useState("");
  const [farmCountry, setFarmCountry] = React.useState("Tunisia");
  const [farmGovernorate, setFarmGovernorate] = React.useState("Nabeul");
  const [farmDelegation, setFarmDelegation] = React.useState("");
  const [farmLocality, setFarmLocality] = React.useState("");
  const [centerLat, setCenterLat] = React.useState(36.4561);
  const [centerLon, setCenterLon] = React.useState(10.7376);
  const [areaHectares, setAreaHectares] = React.useState(5.0);
  const [perimeterMeters, setPerimeterMeters] = React.useState(894);
  const [boundary, setBoundary] = React.useState<GeoPolygon | null>(null);
  const [pins, setPins] = React.useState<FarmPin[]>([]);
  const [mapMode, setMapMode] = React.useState<"INSPECT" | "DROP_PIN" | "DRAW_BOUNDARY">("INSPECT");
  const [baseLayer, setBaseLayer] = React.useState<BaseLayerId>("satellite");
  const [locationQuery, setLocationQuery] = React.useState("");
  const [searchingPlace, setSearchingPlace] = React.useState(false);

  // Stage 3 — Crops State
  const [cropSearch, setCropSearch] = React.useState("");
  const [crops, setCrops] = React.useState<FarmCropRecord[]>([]);
  const [allowCropOverlap, setAllowCropOverlap] = React.useState(false);

  // Stage 4 — Water & Irrigation State
  const [waterSources, setWaterSources] = React.useState<FarmerWaterSourceRecord[]>([]);
  const [irrigationMethod, setIrrigationMethod] = React.useState<IrrigationMethod>("DRIP");
  const [hasPump, setHasPump] = React.useState<"YES" | "NO" | "NOT_SURE">("NO");
  const [pumpPowerKw, setPumpPowerKw] = React.useState("");
  const [pumpType, setPumpType] = React.useState("Submersible Centrifugal");
  const [pumpFlowM3Hr, setPumpFlowM3Hr] = React.useState("");
  const [pumpHoursDay, setPumpHoursDay] = React.useState("6");
  const [pumpEffPct, setPumpEffPct] = React.useState("65");

  // Stage 5 — Solar State
  const [solarStatus, setSolarStatus] = React.useState<SolarOwnershipStatus>("PLANNING");
  const [capacityKwp, setCapacityKwp] = React.useState("");
  const [panelCount, setPanelCount] = React.useState("");
  const [panelWattageW, setPanelWattageW] = React.useState("550");
  const [azimuthDeg, setAzimuthDeg] = React.useState("0");
  const [tiltDeg, setTiltDeg] = React.useState("32");
  const [hasBattery, setHasBattery] = React.useState(false);
  const [batteryKwh, setBatteryKwh] = React.useState("");
  const [hasGrid, setHasGrid] = React.useState(true);
  const [wantsEstimate, setWantsEstimate] = React.useState<"YES" | "NO" | "NOT_SURE">("YES");
  const [budgetAmount, setBudgetAmount] = React.useState("");

  // Completion & Initial Analysis Execution State
  const [completing, setCompleting] = React.useState(false);
  const [analysisPhase, setAnalysisPhase] = React.useState<string | null>(null);
  const [completionDone, setCompletionDone] = React.useState<{
    status: string;
    message?: string | null;
  } | null>(null);

  // Redirect unauthenticated users to /login
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Hydrate persisted onboarding progress from server or offline IndexedDB
  React.useEffect(() => {
    if (!user || loaded) return;

    const hydrate = async () => {
      try {
        const res = await fetch("/api/onboarding");
        if (res.ok) {
          const json = (await res.json()) as {
            farmerProfile: FarmerProfileRecord;
            onboardingProgress: OnboardingProgressRecord;
            activeFarm: FarmRecord | null;
          };
          const p = json.farmerProfile;
          if (p) {
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setPhone(p.phone || "");
            setEmail(p.email || user.email);
            setAvatarUrl(p.avatarUrl || "");
            setCountry(p.country || "Tunisia");
            setGovernorate(p.governorate || "Nabeul");
            setDelegation(p.delegation || "");
            setLocality(p.locality || "");
            setPreferredLanguage(p.preferredLanguage || "en");
            setPreferredUnits(p.preferredUnits || "metric");
            setExperienceLevel(p.experienceLevel || "YEARS_2_5");
            setActivityType(p.activityType || "SMALL_FAMILY_FARM");

            // Default farm location to farmer's chosen governorate if farm isn't created yet
            if (!json.activeFarm && p.governorate) {
              const gov = TUNISIA_GOVERNORATE_COORDS.find((g) => g.name === p.governorate);
              if (gov) {
                setCenterLat(gov.lat);
                setCenterLon(gov.lon);
              }
              setFarmGovernorate(p.governorate);
            }
          } else {
            setEmail(user.email);
          }

          const prog = json.onboardingProgress;
          if (prog) {
            setCurrentStep(Math.min(6, Math.max(1, prog.currentStep || 1)));
            setCompletedSteps(prog.completedSteps || []);
          }

          const f = json.activeFarm;
          if (f) {
            setFarmId(f.id);
            setFarmName(f.name);
            setFarmDesc(f.description || "");
            setFarmCountry(f.country || "Tunisia");
            setFarmGovernorate(f.governorate || "Nabeul");
            setFarmDelegation(f.delegation || "");
            setFarmLocality(f.locality || "");
            setCenterLat(f.centerLat);
            setCenterLon(f.centerLon);
            setAreaHectares(f.areaHectares);
            setPerimeterMeters(f.perimeterMeters);
            setBoundary(f.boundary ?? null);
            setPins(f.pins || []);
            if (f.crops && f.crops.length > 0) setCrops(f.crops);
            if (f.allowCropOverlap) setAllowCropOverlap(f.allowCropOverlap);
            if (f.farmerWaterSources) setWaterSources(f.farmerWaterSources);
            setIrrigationMethod(f.irrigationConfig.irrigationMethod);
            if (f.pumpConfig) {
              setHasPump(f.pumpConfig.hasPump === false ? "NO" : f.pumpConfig.isFarmerProvided ? "YES" : "NOT_SURE");
              if (f.pumpConfig.powerKw) setPumpPowerKw(String(f.pumpConfig.powerKw));
              if (f.pumpConfig.pumpType) setPumpType(f.pumpConfig.pumpType);
              if (f.pumpConfig.isFarmerProvided) {
                setPumpFlowM3Hr(String(f.pumpConfig.flowRateM3Hr));
                setPumpHoursDay(String(f.pumpConfig.operatingHoursDay));
                setPumpEffPct(String(f.pumpConfig.pumpEfficiencyPct));
              }
            }
            if (f.solarConfig) {
              if (f.solarConfig.solarStatus) setSolarStatus(f.solarConfig.solarStatus);
              if (f.solarConfig.isFarmerProvided) {
                setCapacityKwp(String(f.solarConfig.capacityKwp));
                if (f.solarConfig.panelCount) setPanelCount(String(f.solarConfig.panelCount));
                if (f.solarConfig.panelWattageW) setPanelWattageW(String(f.solarConfig.panelWattageW));
              }
              setAzimuthDeg(String(f.solarConfig.azimuthDeg));
              setTiltDeg(String(f.solarConfig.tiltDeg));
              setHasBattery(Boolean(f.solarConfig.hasBattery));
              if (f.solarConfig.batteryCapacityKwh) setBatteryKwh(String(f.solarConfig.batteryCapacityKwh));
              setHasGrid(Boolean(f.solarConfig.hasGridConnection));
              if (f.solarConfig.wantsEstimate) setWantsEstimate(f.solarConfig.wantsEstimate);
              if (f.solarConfig.budgetAmount) setBudgetAmount(String(f.solarConfig.budgetAmount));
            }
          }
        }
      } finally {
        setLoaded(true);
      }
    };

    hydrate();
  }, [user, loaded]);

  const progressPct = Math.round(((Math.min(5, currentStep) - (currentStep === 6 ? 0 : 0.2)) / 5) * 100);

  const searchPlaceOnMap = async () => {
    if (!locationQuery.trim() || !isOnline) return;
    setSearchingPlace(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          `${locationQuery.trim()}, ${farmCountry}`
        )}&limit=1`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const items = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (items[0]) {
          setCenterLat(Number(Number(items[0].lat).toFixed(5)));
          setCenterLon(Number(Number(items[0].lon).toFixed(5)));
        }
      }
    } finally {
      setSearchingPlace(false);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setError("GPS geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setCenterLat(lat);
        setCenterLon(lon);
        if (pins.length === 0) {
          setPins([
            {
              id: `pin_${Date.now()}`,
              farmId: farmId || "draft",
              label: "Farm GPS Pin",
              role: "FIELD_CENTER",
              latitude: lat,
              longitude: lon,
              elevationM: null,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      },
      () => setError("Unable to access GPS location. Please tap the map directly.")
    );
  };

  const toggleCropSelection = (cropCode: string) => {
    const exists = crops.find((c) => c.cropCode === cropCode);
    if (exists) {
      setCrops((prev) => prev.filter((c) => c.cropCode !== cropCode));
      return;
    }
    const spec = CROP_DATABASE.find((c) => c.code === cropCode);
    if (!spec) return;
    const remaining = Math.max(0.5, Number((areaHectares - crops.reduce((s, c) => s + c.cultivatedAreaHa, 0)).toFixed(2)));
    setCrops((prev) => [
      ...prev,
      {
        id: `fc_${Date.now()}_${cropCode}`,
        farmId: farmId || "draft",
        cropCode: spec.code,
        cropName: spec.name,
        cultivatedAreaHa: remaining,
        areaUnit: preferredUnits === "sqm" ? "m2" : "ha",
        plantingDate: "March (Spring)",
        growthStage: "Vegetative / Planning",
        plotCount: 1,
        plantingDensity: "",
        irrigationMethod,
      },
    ]);
  };

  const toggleWaterSourceType = (type: FarmerWaterSourceType) => {
    if (type === "UNKNOWN") {
      setWaterSources([
        {
          id: `fws_${Date.now()}`,
          farmId: farmId || "draft",
          sourceType: "UNKNOWN",
          isFarmerProvided: true,
        },
      ]);
      return;
    }
    const filtered = waterSources.filter((w) => w.sourceType !== "UNKNOWN");
    const exists = filtered.some((w) => w.sourceType === type);
    if (exists) {
      setWaterSources(filtered.filter((w) => w.sourceType !== type));
    } else {
      setWaterSources([
        ...filtered,
        {
          id: `fws_${Date.now()}_${type}`,
          farmId: farmId || "draft",
          sourceType: type,
          availability: "Seasonal / Needs Check",
          isFarmerProvided: true,
        },
      ]);
    }
  };

  const totalCropAreaHa = crops.reduce((s, c) => s + (Number(c.cultivatedAreaHa) || 0), 0);
  const cropAreaExceeds = totalCropAreaHa > areaHectares * 1.001;

  const saveStageAndAdvance = async (stage: number, nextStep: number) => {
    setError(null);
    setSaving(true);
    try {
      let payload: Record<string, unknown> = { stage, nextStep, farmId };

      if (stage === 1) {
        if (!firstName.trim() || !lastName.trim()) {
          setError("Please enter your first and last name.");
          return;
        }
        payload = {
          ...payload,
          profile: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || null,
            avatarUrl: avatarUrl.trim() || null,
            country,
            governorate,
            delegation: delegation.trim() || null,
            locality: locality.trim() || null,
            preferredLanguage,
            preferredUnits,
            experienceLevel,
            activityType,
          },
        };
      } else if (stage === 2) {
        if (!farmName.trim()) {
          setError("Please give your agricultural property a name.");
          return;
        }
        payload = {
          ...payload,
          farm: {
            name: farmName.trim(),
            description: farmDesc.trim() || null,
            country: farmCountry,
            governorate: farmGovernorate,
            delegation: farmDelegation.trim() || null,
            locality: farmLocality.trim() || null,
            centerLat,
            centerLon,
            areaHectares,
            perimeterMeters,
            boundary,
            pins:
              pins.length > 0
                ? pins
                : [
                    {
                      id: `pin_${Date.now()}`,
                      label: "Farm Reference Pin",
                      role: "FIELD_CENTER",
                      latitude: centerLat,
                      longitude: centerLon,
                    },
                  ],
          },
        };
      } else if (stage === 3) {
        if (crops.length === 0) {
          setError("Please select at least one crop (or Other / Custom crop).");
          return;
        }
        if (cropAreaExceeds && !allowCropOverlap) {
          setError(
            `Total crop area (${totalCropAreaHa.toFixed(2)} ha) exceeds farm land area (${areaHectares.toFixed(2)} ha). Adjust crop areas or confirm overlapping/intercropped cultivation.`
          );
          return;
        }
        payload = {
          ...payload,
          crops,
          allowCropOverlap,
        };
      } else if (stage === 4) {
        payload = {
          ...payload,
          waterSources,
          irrigationMethod,
          pump: {
            hasPump: hasPump === "YES",
            pumpType: pumpType || null,
            powerKw: pumpPowerKw ? Number(pumpPowerKw) : null,
            flowRateM3Hr: pumpFlowM3Hr ? Number(pumpFlowM3Hr) : null,
            operatingHoursDay: pumpHoursDay ? Number(pumpHoursDay) : 6,
            pumpEfficiencyPct: pumpEffPct ? Number(pumpEffPct) : 65,
          },
        };
      } else if (stage === 5) {
        payload = {
          ...payload,
          solar: {
            solarStatus,
            capacityKwp: capacityKwp ? Number(capacityKwp) : null,
            panelCount: panelCount ? Number(panelCount) : null,
            panelWattageW: panelWattageW ? Number(panelWattageW) : null,
            azimuthDeg: azimuthDeg !== "" ? Number(azimuthDeg) : 0,
            tiltDeg: tiltDeg !== "" ? Number(tiltDeg) : 32,
            hasBattery,
            batteryCapacityKwh: batteryKwh ? Number(batteryKwh) : null,
            hasGridConnection: hasGrid,
            wantsEstimate,
            budgetAmount: budgetAmount ? Number(budgetAmount) : null,
          },
        };
      }

      if (!isOnline && user) {
        // Offline fallback: save locally to Dexie and queue sync
        const nextCompleted = Array.from(new Set([...completedSteps, stage])).sort();
        await saveOnboardingOffline({
          userId: user.id,
          progress: {
            id: `onb_${user.id}`,
            userId: user.id,
            activeFarmId: farmId || `farm_${user.id}_primary`,
            currentStep: nextStep,
            completedSteps: nextCompleted,
            isCompleted: false,
            updatedAt: new Date().toISOString(),
          },
          queueSync: true,
        });
        setCompletedSteps(nextCompleted);
        setCurrentStep(nextStep);
        setAutosaveStatus("Saved offline • Queued for sync");
        return;
      }

      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save onboarding progress.");
        return;
      }

      if (json.farm?.id) {
        setFarmId(json.farm.id);
        setActiveFarmId(json.farm.id);
        setPins(json.farm.pins || []);
      }
      if (json.onboardingProgress) {
        setCompletedSteps(json.onboardingProgress.completedSteps || []);
      }
      setCurrentStep(nextStep);
      setAutosaveStatus("Autosaved to database");
    } catch {
      setError("Unable to save right now. Check connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setError(null);
    setCompleting(true);
    setAnalysisPhase("Saving onboarding completion & fetching Open-Meteo weather, elevation, water sources, and PVGIS solar potential...");
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, skipRemoteAnalysis: !isOnline }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not finalize onboarding.");
        setCompleting(false);
        return;
      }
      if (json.farm?.id) {
        setActiveFarmId(json.farm.id);
      }
      setCompletionDone({
        status: json.analysisStatus,
        message: json.pendingMessage,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
      await queryClient.invalidateQueries({ queryKey: ["farms"] });
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 900);
    } catch {
      setError("Network error completing onboarding.");
      setCompleting(false);
    }
  };

  if (authLoading || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-[#14532d]" />
          <span>Loading your onboarding workspace...</span>
        </div>
      </div>
    );
  }

  const filteredCrops = CROP_DATABASE.filter(
    (c) =>
      c.name.toLowerCase().includes(cropSearch.toLowerCase()) ||
      c.scientificName.toLowerCase().includes(cropSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(cropSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Compact Sticky Progress Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#14532d] text-white flex items-center justify-center shrink-0">
                <Sprout className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">TerraPulse Farm Setup</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentStep <= 5 ? `Stage ${currentStep} of 5` : "Confirmation"} • {autosaveStatus || "Progress saved automatically"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={isOnline ? "green" : "amber"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
              <Button size="sm" variant="ghost" onClick={logout} title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>

          {/* Progress Bar + Clickable Step Pills */}
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[#14532d] dark:bg-[#22c55e] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(12, progressPct))}%` }}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {STAGE_META.map((item) => {
                const Icon = item.icon;
                const isDone = completedSteps.includes(item.step);
                const isActive = currentStep === item.step;
                const canJump = isDone || item.step <= Math.max(1, ...completedSteps, currentStep);
                return (
                  <button
                    key={item.step}
                    type="button"
                    disabled={!canJump}
                    onClick={() => canJump && setCurrentStep(item.step)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      isActive
                        ? "bg-[#14532d] text-white border-[#14532d]"
                        : isDone
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    {isDone && !isActive ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Active Stage Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-5">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs flex items-start gap-2 text-red-900 dark:text-red-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STAGE 1 — FARMER PROFILE */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Let&apos;s get to know you</CardTitle>
              <CardDescription>
                Tell us a little about yourself so we can personalize your agricultural experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">First name *</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Amine"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Last name *</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ben Ali"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Phone number</label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Email (verified account)</label>
                  <Input value={email} readOnly className="h-11 bg-muted text-muted-foreground" />
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Location & Preferences
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Country</label>
                    <Input
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setFarmCountry(e.target.value);
                      }}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Governorate</label>
                    <Select
                      value={governorate}
                      onChange={(e) => {
                        const govName = e.target.value;
                        setGovernorate(govName);
                        setFarmGovernorate(govName);
                        const match = TUNISIA_GOVERNORATE_COORDS.find((g) => g.name === govName);
                        if (match && !farmId) {
                          setCenterLat(match.lat);
                          setCenterLon(match.lon);
                        }
                      }}
                      className="h-11"
                    >
                      {TUNISIA_GOVERNORATE_COORDS.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Delegation</label>
                    <Input
                      value={delegation}
                      onChange={(e) => {
                        setDelegation(e.target.value);
                        setFarmDelegation(e.target.value);
                      }}
                      placeholder="e.g., Grombalia"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">City / Locality</label>
                    <Input
                      value={locality}
                      onChange={(e) => {
                        setLocality(e.target.value);
                        setFarmLocality(e.target.value);
                      }}
                      placeholder="e.g., Fondouk Jedid"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Preferred language</label>
                    <Select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value as "en" | "fr" | "ar")}
                      className="h-11"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Measurement units</label>
                    <Select
                      value={preferredUnits}
                      onChange={(e) => setPreferredUnits(e.target.value as "metric" | "sqm")}
                      className="h-11"
                    >
                      <option value="metric">Hectares (ha) & m³</option>
                      <option value="sqm">Square meters (m²) & Liters</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    How long have you been involved in agriculture?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setExperienceLevel(opt.value)}
                        className={`p-3 rounded-xl border text-xs font-medium text-left cursor-pointer transition-colors ${
                          experienceLevel === opt.value
                            ? "border-[#14532d] bg-emerald-50 dark:bg-emerald-950/50 text-[#14532d] dark:text-emerald-300"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    How would you describe your agricultural activity?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setActivityType(opt.value)}
                        className={`p-3 rounded-xl border text-xs font-medium text-left cursor-pointer transition-colors ${
                          activityType === opt.value
                            ? "border-[#14532d] bg-emerald-50 dark:bg-emerald-950/50 text-[#14532d] dark:text-emerald-300"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  disabled={saving}
                  onClick={() => saveStageAndAdvance(1, 2)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STAGE 2 — CREATE YOUR FARM */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Let&apos;s add your agricultural land</CardTitle>
              <CardDescription>
                Give your farm a name and identify its exact location on the map. Drawing a boundary is optional — a GPS pin is enough to begin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Farm name *</label>
                  <Input
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g., Domaine Oued El Kheir"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Description (optional)</label>
                  <Input
                    value={farmDesc}
                    onChange={(e) => setFarmDesc(e.target.value)}
                    placeholder="Irrigated olive & vegetable parcel"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Governorate</label>
                  <Select
                    value={farmGovernorate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFarmGovernorate(val);
                      const match = TUNISIA_GOVERNORATE_COORDS.find((g) => g.name === val);
                      if (match) {
                        setCenterLat(match.lat);
                        setCenterLon(match.lon);
                      }
                    }}
                    className="h-11"
                  >
                    {TUNISIA_GOVERNORATE_COORDS.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Delegation</label>
                    <Input
                      value={farmDelegation}
                      onChange={(e) => setFarmDelegation(e.target.value)}
                      placeholder="Delegation"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Locality</label>
                    <Input
                      value={farmLocality}
                      onChange={(e) => setFarmLocality(e.target.value)}
                      placeholder="Address / locality"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Location Search & GPS Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Search place or village (e.g., Korba, Nabeul)..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="h-10 text-xs"
                  />
                  <Button
                    type="button"
                    size="md"
                    variant="outline"
                    disabled={searchingPlace || !isOnline}
                    onClick={searchPlaceOnMap}
                  >
                    <Search className="h-3.5 w-3.5" />
                    Find
                  </Button>
                </div>
                <Button type="button" size="md" variant="secondary" onClick={handleUseCurrentGps}>
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  Use Current GPS
                </Button>
              </div>

              {/* Existing MapLibre Component Reused */}
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
                    ...prev,
                    {
                      id: `pin_${Date.now()}`,
                      farmId: farmId || "draft",
                      label: `Field Pin #${prev.length + 1}`,
                      role,
                      latitude: lat,
                      longitude: lon,
                      elevationM: null,
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                }}
                onBoundaryChange={(poly, areaHa, perimM) => {
                  setBoundary(poly);
                  setAreaHectares(areaHa);
                  setPerimeterMeters(perimM);
                }}
                onCoordinateInspect={(lat, lon) => {
                  setCenterLat(lat);
                  setCenterLon(lon);
                }}
              />

              {/* Metrics + Pin-Only Estimated Area Fallback */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Latitude</span>
                  <p className="font-mono font-bold">{centerLat.toFixed(5)}°</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Longitude</span>
                  <p className="font-mono font-bold">{centerLon.toFixed(5)}°</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Total Land Area</span>
                  {boundary ? (
                    <p className="font-bold">
                      {areaHectares.toFixed(2)} ha ({Math.round(areaHectares * 10000).toLocaleString()} m²)
                    </p>
                  ) : (
                    <Input
                      type="number"
                      step="0.1"
                      min="0.05"
                      value={areaHectares}
                      onChange={(e) => setAreaHectares(Math.max(0.05, Number(e.target.value)))}
                      className="mt-1 h-8 text-xs"
                    />
                  )}
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Boundary Status</span>
                  <div className="mt-1">
                    {boundary ? (
                      <Badge variant="green">Verified • {Math.round(perimeterMeters)} m</Badge>
                    ) : (
                      <Badge variant="amber">Pin-only (Unverified)</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={saving}
                  onClick={() => saveStageAndAdvance(2, 3)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Confirm Location & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STAGE 3 — WHAT DO YOU GROW? */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">What crops are you cultivating?</CardTitle>
              <CardDescription>
                Select one or more crops on your {areaHectares.toFixed(2)} ha parcel to calculate FAO-56 water requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search crops (e.g., Olive, Wheat, Barley, Tomato, Dates, Citrus)..."
                  value={cropSearch}
                  onChange={(e) => setCropSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-0.5">
                {filteredCrops.map((spec) => {
                  const selected = crops.some((c) => c.cropCode === spec.code);
                  return (
                    <button
                      key={spec.code}
                      type="button"
                      onClick={() => toggleCropSelection(spec.code)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? "border-[#14532d] bg-emerald-50 dark:bg-emerald-950/50"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold truncate">{spec.name}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
                      </div>
                      <p className="text-[10px] italic text-muted-foreground truncate">
                        {spec.scientificName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Kc mid {spec.kcMid} • Root {spec.rootDepthMaxM}m
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Crops Allocation Details */}
              {crops.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      Selected Crops ({crops.length}) — Allocated {totalCropAreaHa.toFixed(2)} ha /{" "}
                      {areaHectares.toFixed(2)} ha
                    </p>
                    <Badge variant={cropAreaExceeds ? "amber" : "green"}>
                      {cropAreaExceeds ? "Exceeds Farm Area" : "Area Valid"}
                    </Badge>
                  </div>

                  {crops.map((crop, idx) => (
                    <div
                      key={crop.id}
                      className="p-3 rounded-xl border border-border bg-muted/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{crop.cropName}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCropSelection(crop.cropCode)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-medium">Area (ha)</label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.01"
                            value={crop.cultivatedAreaHa}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCrops((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, cultivatedAreaHa: val } : c
                                )
                              );
                            }}
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium">Planting period</label>
                          <Input
                            value={crop.plantingDate || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCrops((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, plantingDate: val } : c))
                              );
                            }}
                            placeholder="e.g., March / 2026-03-15"
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium">Growth stage</label>
                          <Input
                            value={crop.growthStage || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCrops((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, growthStage: val } : c))
                              );
                            }}
                            placeholder="e.g., Initial / Mature"
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium">Plots count</label>
                          <Input
                            type="number"
                            min="1"
                            value={crop.plotCount}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setCrops((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, plotCount: val } : c))
                              );
                            }}
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium">Planting density</label>
                          <Input
                            value={crop.plantingDensity || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCrops((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, plantingDensity: val } : c
                                )
                              );
                            }}
                            placeholder="e.g., 200 trees/ha"
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium">Irrigation</label>
                          <Select
                            value={crop.irrigationMethod}
                            onChange={(e) => {
                              const val = e.target.value as IrrigationMethod;
                              setCrops((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, irrigationMethod: val } : c
                                )
                              );
                            }}
                            className="mt-1 h-9 text-xs"
                          >
                            {IRRIGATION_SYSTEM_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {cropAreaExceeds && (
                    <label className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCropOverlap}
                        onChange={(e) => setAllowCropOverlap(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Confirm overlapping / intercropped or multi-season rotation cultivation exceeding {areaHectares.toFixed(2)} ha total land area.
                      </span>
                    </label>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={saving}
                  onClick={() => saveStageAndAdvance(3, 4)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save Crops & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STAGE 4 — WATER & IRRIGATION */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">How do you manage water on your farm?</CardTitle>
              <CardDescription>
                Select any known water sources and irrigation setup. Leave unknown technical fields blank — we&apos;ll clearly separate your values from calculated estimates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              <div className="space-y-2">
                <label className="font-semibold">Water sources (select all that apply)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WATER_SOURCE_OPTIONS.map((opt) => {
                    const active = waterSources.some((w) => w.sourceType === opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleWaterSourceType(opt.value)}
                        className={`p-3 rounded-xl border text-left font-medium cursor-pointer transition-colors ${
                          active
                            ? "border-sky-600 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {waterSources.filter((w) => w.sourceType !== "UNKNOWN").length > 0 && (
                <div className="space-y-2.5">
                  <p className="font-semibold">Optional source details</p>
                  {waterSources
                    .filter((w) => w.sourceType !== "UNKNOWN")
                    .map((ws) => (
                      <div key={ws.id} className="p-3 rounded-xl border border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="col-span-2 sm:col-span-4 flex items-center justify-between">
                          <Badge variant="blue">{ws.sourceType.replace("_", " ")}</Badge>
                          <span className="text-[11px] text-muted-foreground">Farmer-provided</span>
                        </div>
                        <div>
                          <label className="text-[11px]">Distance (m)</label>
                          <Input
                            type="number"
                            placeholder="Optional"
                            value={ws.distanceMeters ?? ""}
                            onChange={(e) =>
                              setWaterSources((prev) =>
                                prev.map((x) =>
                                  x.id === ws.id
                                    ? { ...x, distanceMeters: e.target.value ? Number(e.target.value) : null }
                                    : x
                                )
                              )
                            }
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px]">Well Depth (m)</label>
                          <Input
                            type="number"
                            placeholder="Optional"
                            value={ws.wellDepthM ?? ""}
                            onChange={(e) =>
                              setWaterSources((prev) =>
                                prev.map((x) =>
                                  x.id === ws.id
                                    ? { ...x, wellDepthM: e.target.value ? Number(e.target.value) : null }
                                    : x
                                )
                              )
                            }
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px]">Flow Rate (m³/h)</label>
                          <Input
                            type="number"
                            placeholder="Optional"
                            value={ws.flowRateM3Hr ?? ""}
                            onChange={(e) =>
                              setWaterSources((prev) =>
                                prev.map((x) =>
                                  x.id === ws.id
                                    ? { ...x, flowRateM3Hr: e.target.value ? Number(e.target.value) : null }
                                    : x
                                )
                              )
                            }
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px]">Quality / Salinity</label>
                          <Input
                            placeholder="e.g., Fresh / Brackish"
                            value={ws.waterQualityNotes ?? ""}
                            onChange={(e) =>
                              setWaterSources((prev) =>
                                prev.map((x) =>
                                  x.id === ws.id ? { ...x, waterQualityNotes: e.target.value } : x
                                )
                              )
                            }
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="font-semibold">Primary irrigation system</label>
                  <Select
                    value={irrigationMethod}
                    onChange={(e) => setIrrigationMethod(e.target.value as IrrigationMethod)}
                    className="h-11"
                  >
                    {IRRIGATION_SYSTEM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Do you already have a water pump?</label>
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    {(["YES", "NO", "NOT_SURE"] as const).map((ans) => (
                      <button
                        key={ans}
                        type="button"
                        onClick={() => setHasPump(ans)}
                        className={`h-10 rounded-lg border font-medium cursor-pointer ${
                          hasPump === ans
                            ? "border-[#14532d] bg-[#14532d] text-white"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {ans === "YES" ? "Yes" : ans === "NO" ? "No" : "Not sure"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {hasPump === "YES" && (
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium">Pump Power (kW)</label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Optional"
                      value={pumpPowerKw}
                      onChange={(e) => setPumpPowerKw(e.target.value)}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium">Pump Type</label>
                    <Input
                      value={pumpType}
                      onChange={(e) => setPumpType(e.target.value)}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium">Flow (m³/h)</label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Optional"
                      value={pumpFlowM3Hr}
                      onChange={(e) => setPumpFlowM3Hr(e.target.value)}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium">Hours / Day</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={pumpHoursDay}
                      onChange={(e) => setPumpHoursDay(e.target.value)}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium">Efficiency (%)</label>
                    <Input
                      type="number"
                      placeholder="65"
                      value={pumpEffPct}
                      onChange={(e) => setPumpEffPct(e.target.value)}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={saving}
                  onClick={() => saveStageAndAdvance(4, 5)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save Water Setup & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STAGE 5 — SOLAR ENERGY */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Tell us about your energy system</CardTitle>
              <CardDescription>
                We&apos;ll use this information to estimate whether solar energy can support your irrigation needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              <div className="space-y-2">
                <label className="font-semibold">Do you currently have solar panels?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: "YES", label: "Yes" },
                    { value: "NO", label: "No" },
                    { value: "PLANNING", label: "Planning to install" },
                    { value: "NOT_SURE", label: "Not sure yet" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSolarStatus(opt.value as SolarOwnershipStatus)}
                      className={`p-3 rounded-xl border font-medium cursor-pointer ${
                        solarStatus === opt.value
                          ? "border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {solarStatus === "YES" ? (
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
                  <p className="font-semibold">Your Existing Solar Installation (Optional specs)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium">Capacity (kWp)</label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="e.g., 10"
                        value={capacityKwp}
                        onChange={(e) => setCapacityKwp(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium">Panel count</label>
                      <Input
                        type="number"
                        placeholder="e.g., 18"
                        value={panelCount}
                        onChange={(e) => setPanelCount(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium">Panel wattage (W)</label>
                      <Input
                        type="number"
                        value={panelWattageW}
                        onChange={(e) => setPanelWattageW(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium">Tilt (°)</label>
                      <Input
                        type="number"
                        value={tiltDeg}
                        onChange={(e) => setTiltDeg(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium">Orientation (0° South)</label>
                      <Input
                        type="number"
                        value={azimuthDeg}
                        onChange={(e) => setAzimuthDeg(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium">Battery (kWh)</label>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={batteryKwh}
                        onChange={(e) => {
                          setBatteryKwh(e.target.value);
                          setHasBattery(Boolean(e.target.value));
                        }}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-4 pt-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasBattery}
                          onChange={(e) => setHasBattery(e.target.checked)}
                        />
                        <span>Battery backup</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasGrid}
                          onChange={(e) => setHasGrid(e.target.checked)}
                        />
                        <span>Grid connection</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
                  <p className="font-semibold">
                    Would you like us to estimate the solar installation needed for your farm?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["YES", "NO", "NOT_SURE"] as const).map((ans) => (
                      <button
                        key={ans}
                        type="button"
                        onClick={() => setWantsEstimate(ans)}
                        className={`h-10 rounded-lg border font-medium cursor-pointer ${
                          wantsEstimate === ans
                            ? "border-[#14532d] bg-[#14532d] text-white"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {ans === "YES" ? "Yes" : ans === "NO" ? "No" : "Not sure"}
                      </button>
                    ))}
                  </div>
                  {wantsEstimate === "YES" && (
                    <div className="max-w-xs">
                      <label className="text-[11px] font-medium">
                        Optional solar investment budget (TND or USD equivalent)
                      </label>
                      <Input
                        type="number"
                        placeholder="Optional (leave blank if unsure)"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Default assumptions: optimal South-facing tilt (~32° for Tunisia) and 14% PVGIS system losses.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={saving}
                  onClick={() => saveStageAndAdvance(5, 6)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Review Summary</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STAGE 6 — CONFIRMATION & INITIAL ANALYSIS */}
        {currentStep === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Your farm is ready for analysis</CardTitle>
              <CardDescription>
                Review your information below. You can return to any stage to make adjustments before launching your first environmental, water & solar feasibility assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">1. Farmer Profile</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[#14532d] dark:text-emerald-400 underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <p>{firstName} {lastName} ({email})</p>
                  <p className="text-muted-foreground">
                    {country} • {governorate} {delegation ? `/ ${delegation}` : ""}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">2. Farm Land & Location</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[#14532d] dark:text-emerald-400 underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <p>{farmName}</p>
                  <p className="text-muted-foreground">
                    {centerLat.toFixed(4)}°, {centerLon.toFixed(4)}° • {areaHectares.toFixed(2)} ha ({boundary ? "Verified boundary" : "Pin-only"})
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">3. Selected Crops ({crops.length})</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-[#14532d] dark:text-emerald-400 underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  {crops.map((c) => (
                    <p key={c.id}>
                      {c.cropName}: <strong>{c.cultivatedAreaHa} ha</strong> ({c.irrigationMethod})
                    </p>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">4 & 5. Water & Solar Energy</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="text-[#14532d] dark:text-emerald-400 underline cursor-pointer"
                      >
                        Water
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(5)}
                        className="text-[#14532d] dark:text-emerald-400 underline cursor-pointer"
                      >
                        Solar
                      </button>
                    </div>
                  </div>
                  <p>
                    Sources: {waterSources.length > 0 ? waterSources.map((w) => w.sourceType).join(", ") : "Unspecified"}
                  </p>
                  <p className="text-muted-foreground">
                    Irrigation: {irrigationMethod} • Solar: {solarStatus} {capacityKwp ? `(${capacityKwp} kWp)` : "(PVGIS estimate enabled)"}
                  </p>
                </div>
              </div>

              {analysisPhase && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                    {completionDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {completionDone
                        ? "Initial analysis complete! Opening your personalized dashboard..."
                        : analysisPhase}
                    </span>
                  </div>
                  {completionDone?.message && (
                    <p className="text-muted-foreground">{completionDone.message}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(5)} disabled={completing}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={completing}
                  onClick={handleCompleteOnboarding}
                >
                  {completing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>{completing ? "Analyzing Farm..." : "Confirm & Analyze My Farm"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
