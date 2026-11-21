"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Map as MapIcon, AlertTriangle } from "lucide-react";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import {
  ThreeStepFarmWizard,
  type WizardSubmitPayload,
} from "@/components/farmer/ThreeStepFarmWizard";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useDeleteFarm, useFarms, useSaveFarm } from "@/hooks/useFarms";
import {
  IRRIGATION_EFFICIENCY_DEFAULTS,
  SOIL_TEXTURE_DEFAULTS,
} from "@/lib/db/defaults";
import { useAppStore } from "@/lib/store/app-store";
import type { FarmRecord } from "@/types/agri";
import { cn } from "@/lib/utils";

function buildFarmRecordFromDraft(
  draft: WizardSubmitPayload,
  existingFarm?: FarmRecord | null
): FarmRecord {
  const now = new Date().toISOString();
  const isNew = !existingFarm;
  const farmId = existingFarm?.id ?? `farm_${Date.now()}`;
  const irrDefaults = IRRIGATION_EFFICIENCY_DEFAULTS[draft.irrigationMethod];
  const soilDefaults = SOIL_TEXTURE_DEFAULTS[draft.soilTexture];

  return {
    id: farmId,
    userId: existingFarm?.userId ?? "user_demo_agronomist",
    name: draft.name,
    description: existingFarm?.description ?? null,
    country: draft.country,
    region: [draft.governorate, draft.delegation].filter(Boolean).join(" / ") || null,
    governorate: draft.governorate,
    delegation: draft.delegation || null,
    locality: draft.locality || null,
    centerLat: draft.centerLat,
    centerLon: draft.centerLon,
    elevationM: existingFarm?.elevationM ?? null,
    areaHectares: draft.areaHectares,
    perimeterMeters: draft.perimeterMeters,
    boundary: draft.boundary,
    boundaryVerified: Boolean(draft.boundary),
    pins: draft.pins,
    crops: [
      {
        id: existingFarm?.crops?.[0]?.id ?? `fc_${farmId}_0`,
        farmId,
        cropCode: draft.cropCode,
        cropName: draft.cropName,
        cultivatedAreaHa: draft.areaHectares,
        areaUnit: "ha",
        plantingDate: null,
        growthStage: null,
        plotCount: 1,
        plantingDensity: null,
        irrigationMethod: draft.irrigationMethod,
      },
    ],
    farmerWaterSources: [
      {
        id: existingFarm?.farmerWaterSources?.[0]?.id ?? `fws_${farmId}_0`,
        farmId,
        sourceType: draft.waterSourceType,
        wellDepthM: draft.wellDepthM,
        flowRateM3Hr: draft.flowRateM3Hr,
        isFarmerProvided: true,
      },
    ],
    soilProfile: {
      ...soilDefaults,
      source: "Estimated from soil feel",
      updatedAt: now,
    },
    solarConfig: {
      solarStatus: draft.solarStatus,
      capacityKwp: draft.capacityKwp,
      panelCount: draft.panelCount,
      panelWattageW: 500,
      tiltDeg: draft.tiltDeg,
      azimuthDeg: draft.azimuthDeg,
      mountingType: existingFarm?.solarConfig.mountingType ?? "free",
      systemLossPct: draft.systemLossPct,
      optimizeAngles: existingFarm?.solarConfig.optimizeAngles ?? false,
      isFarmerProvided: !draft.solarIsEstimate,
      updatedAt: now,
    },
    pumpConfig: {
      hasPump: draft.hasPump,
      flowRateM3Hr: draft.flowRateM3Hr,
      staticHeadM: draft.staticHeadM,
      pipeLengthM: draft.pipeLengthM,
      pipeDiameterMm: draft.pipeDiameterMm,
      pipeMaterialC: 140,
      frictionLossM: existingFarm?.pumpConfig.frictionLossM ?? 3.5,
      operatingPressureHeadM: irrDefaults.typicalPressureHeadM,
      totalDynamicHeadM:
        draft.staticHeadM + irrDefaults.typicalPressureHeadM + 3.5,
      pumpEfficiencyPct: draft.pumpEfficiencyPct,
      motorEfficiencyPct: 88,
      operatingHoursDay: draft.operatingHoursDay,
      isFarmerProvided: !draft.pumpIsEstimate,
      updatedAt: now,
    },
    irrigationConfig: {
      cropCode: draft.cropCode,
      irrigatedAreaHa: draft.areaHectares,
      irrigationMethod: draft.irrigationMethod,
      applicationEfficiencyPct: irrDefaults.efficiencyPct,
      plantingMonth: draft.plantingMonth,
    },
    createdAt: isNew ? now : existingFarm.createdAt,
    updatedAt: now,
  };
}

export default function FarmsPage() {
  const router = useRouter();
  const { t, fmt } = useLanguage();
  const { farms, activeFarm, setActiveFarmId } = useFarms();
  const saveFarm = useSaveFarm();
  const deleteFarm = useDeleteFarm();
  const isOnline = useAppStore((s) => s.isOnline);

  const [creatingNew, setCreatingNew] = React.useState(false);
  const [initialStep, setInitialStep] = React.useState<1 | 2 | 3>(1);
  const [confirmDeleteTarget, setConfirmDeleteTarget] =
    React.useState<FarmRecord | null>(null);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") === "1") setCreatingNew(true);
    const st = Number(sp.get("step"));
    if (st === 1 || st === 2 || st === 3) setInitialStep(st);
  }, []);

  const handleFinish = async (draft: WizardSubmitPayload) => {
    const isNew = creatingNew || !activeFarm;
    const record = buildFarmRecordFromDraft(draft, isNew ? null : activeFarm);
    await saveFarm.mutateAsync({ farm: record, isNew });
    setCreatingNew(false);
    setSavedNotice(
      isOnline
        ? "Saved and updated your farm numbers."
        : "Saved on your phone. It will sync automatically when online."
    );
    if (isNew) {
      router.push("/");
    } else {
      setTimeout(() => setSavedNotice(null), 5000);
    }
  };

  const handleConfirmedDelete = async () => {
    if (!confirmDeleteTarget) return;
    const deletedId = confirmDeleteTarget.id;
    setConfirmDeleteTarget(null);
    await deleteFarm.mutateAsync(deletedId);
    const remaining = farms.find((f) => f.id !== deletedId);
    if (remaining) setActiveFarmId(remaining.id);
    setCreatingNew(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <FarmerPageHeader
        mobileLabel={creatingNew ? t.addFarmTitle : t.myFarmTitle}
        title={creatingNew ? t.addFarmTitle : t.myFarmTitle}
        subtitle={t.threeShortSteps}
        rightAction={
          <>
            <button
              type="button"
              onClick={() => {
                setCreatingNew((v) => !v);
                setInitialStep(1);
              }}
              className={cn(
                "min-h-[48px] px-5 rounded-full text-[16px] font-bold inline-flex items-center gap-2",
                creatingNew
                  ? "border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[var(--tp-fg-17251C)]"
                  : "bg-[var(--tp-bg-2E6B3A)] text-white"
              )}
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>{creatingNew ? t.myFarmTitle : t.addFarmTitle}</span>
            </button>
            <Link
              href="/map"
              className="min-h-[48px] px-4 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[15px] font-bold text-[var(--tp-fg-17251C)] no-underline inline-flex items-center gap-2"
            >
              <MapIcon className="w-4 h-4" aria-hidden="true" />
              <span>Full map</span>
            </Link>
          </>
        }
      />

      {/* Saved Farms Switcher + Safe Delete */}
      <div className="flex flex-wrap items-center gap-2.5">
        {farms.map((farm) => {
          const isCurrent = !creatingNew && activeFarm?.id === farm.id;
          return (
            <div
              key={farm.id}
              className={cn(
                "rounded-[14px] border-[1.5px] flex items-center overflow-hidden",
                isCurrent
                  ? "bg-[var(--tp-bg-E3EFE2)] border-[var(--tp-bd-2E6B3A)] text-[var(--tp-fg-1F4D28)]"
                  : "bg-[var(--tp-bg-FFFFFF)] border-[var(--tp-bd-E4DFD2)] text-[var(--tp-fg-17251C)]"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setCreatingNew(false);
                  setActiveFarmId(farm.id);
                }}
                className="min-h-[48px] px-4 py-2 text-start flex flex-col justify-center"
              >
                <b className="text-[16px] leading-tight">{farm.name}</b>
                <span className="text-[13px] opacity-85">
                  {Number(farm.areaHectares.toFixed(1))} {t.hectaresShort}
                </span>
              </button>
              {farms.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(farm)}
                  aria-label={`Delete ${farm.name}`}
                  className="min-h-[48px] min-w-[44px] px-2.5 flex items-center justify-center text-[var(--tp-fg-8A4B00)] hover:bg-[var(--tp-bg-FCEFD9)] border-s border-[var(--tp-bd-E4DFD2)]"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setCreatingNew(true);
            setInitialStep(1);
          }}
          className="lg:hidden min-h-[48px] px-4 rounded-full bg-[var(--tp-bg-2E6B3A)] text-white text-[15px] font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addFarmTitle}</span>
        </button>
      </div>

      {savedNotice && (
        <div className="bg-[var(--tp-bg-E3EFE2)] border border-[var(--tp-bd-7FB083)] text-[var(--tp-fg-1F4D28)] rounded-[14px] px-4 py-3 text-[16px] font-bold">
          {savedNotice}
        </div>
      )}

      {/* Confirmation Dialog naming the farm before delete (Bug #2 fix) */}
      {confirmDeleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[var(--tp-bg-FFFFFF)] border-2 border-[var(--tp-bd-E2B66B)] rounded-[20px] p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-[var(--tp-fg-8A4B00)]">
              <AlertTriangle className="w-7 h-7 shrink-0" aria-hidden="true" />
              <h2 id="delete-dialog-title" className="m-0 text-[22px] font-bold">
                Delete {confirmDeleteTarget.name}?
              </h2>
            </div>
            <p className="m-0 text-[16px] text-[var(--tp-fg-3B3020)] leading-[1.45]">
              {fmt(t.deleteFarmConfirm, { name: confirmDeleteTarget.name })}
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="min-h-[48px] px-5 rounded-full border-[1.5px] border-[var(--tp-bd-B8B1A0)] bg-[var(--tp-bg-FFFFFF)] text-[16px] font-bold text-[var(--tp-fg-17251C)]"
              >
                Keep farm
              </button>
              <button
                type="button"
                onClick={handleConfirmedDelete}
                disabled={deleteFarm.isPending}
                className="min-h-[48px] px-6 rounded-full bg-[var(--tp-bg-8A4B00)] text-white text-[16px] font-bold"
              >
                {deleteFarm.isPending ? "Removing…" : `Yes, delete ${confirmDeleteTarget.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ThreeStepFarmWizard
        mode="farms"
        initialFarm={creatingNew ? null : activeFarm}
        initialStep={initialStep}
        onCancel={creatingNew ? () => setCreatingNew(false) : undefined}
        onFinish={handleFinish}
        submitting={saveFarm.isPending}
        finishLabel={creatingNew ? t.saveFarmBtn : "Save changes"}
      />
    </div>
  );
}
