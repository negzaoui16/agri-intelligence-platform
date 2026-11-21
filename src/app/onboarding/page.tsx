"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, LogOut, Sprout } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  ThreeStepFarmWizard,
  type WizardSubmitPayload,
} from "@/components/farmer/ThreeStepFarmWizard";
import { useAuthSession } from "@/hooks/useAuth";
import { saveOnboardingOffline } from "@/lib/offline/sync-engine";
import { useAppStore } from "@/lib/store/app-store";
import type { FarmRecord } from "@/types/agri";
import { useQueryClient } from "@tanstack/react-query";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuthSession();
  const { lang, t, isRtl } = useLanguage();
  const isOnline = useAppStore((s) => s.isOnline);
  const setActiveFarmId = useAppStore((s) => s.setActiveFarmId);

  const [loaded, setLoaded] = React.useState(false);
  const [activeFarm, setActiveFarm] = React.useState<FarmRecord | null>(null);
  const [activeFarmIdState, setActiveFarmIdState] = React.useState<string | undefined>(
    undefined
  );
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  React.useEffect(() => {
    if (!isAuthenticated || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const prof = json.farmerProfile;
        if (prof) {
          setFirstName(prof.firstName || user?.name?.split(" ")[0] || "Farmer");
          setLastName(prof.lastName || user?.name?.split(" ").slice(1).join(" ") || "User");
          setPhone(prof.phone || "");
        }
        if (json.activeFarm) {
          setActiveFarm(json.activeFarm);
          setActiveFarmIdState(json.activeFarm.id);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loaded, user]);

  const persistStage = async (
    stage: 1 | 2 | 3 | 4 | 5,
    nextStep: number,
    payload: Record<string, unknown>
  ): Promise<string | undefined> => {
    if (!isOnline && user) {
      await saveOnboardingOffline({
        userId: user.id,
        farm: activeFarm,
        progress: {
          id: `prog_${user.id}`,
          userId: user.id,
          currentStep: nextStep,
          completedSteps: [stage],
          isCompleted: false,
          activeFarmId: activeFarmIdState ?? null,
          updatedAt: new Date().toISOString(),
        },
        queueSync: true,
      }).catch(() => undefined);
      return activeFarmIdState;
    }

    const res = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        nextStep,
        farmId: activeFarmIdState,
        ...payload,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Unable to save your step.");
    }
    if (json.farm?.id) {
      setActiveFarmIdState(json.farm.id);
      setActiveFarm(json.farm);
      return json.farm.id;
    }
    return activeFarmIdState;
  };

  const handleSaveStep = async (wizardStep: 1 | 2 | 3, draft: WizardSubmitPayload) => {
    setError(null);
    if (wizardStep === 1) {
      await persistStage(1, 2, {
        profile: {
          firstName: firstName.trim() || user?.name?.split(" ")[0] || "Farmer",
          lastName: lastName.trim() || user?.name?.split(" ").slice(1).join(" ") || "Account",
          phone: phone.trim() || null,
          country: draft.country || "Tunisia",
          governorate: draft.governorate || "Nabeul",
          delegation: draft.delegation || null,
          locality: draft.locality || null,
          preferredLanguage: lang,
          preferredUnits: "metric",
          experienceLevel: "YEARS_2_5",
          activityType: "SMALL_FAMILY_FARM",
        },
      });
      return persistStage(2, 3, {
        farm: {
          name: draft.name,
          country: draft.country,
          governorate: draft.governorate,
          delegation: draft.delegation,
          locality: draft.locality,
          centerLat: draft.centerLat,
          centerLon: draft.centerLon,
          areaHectares: draft.areaHectares,
          perimeterMeters: draft.perimeterMeters,
          boundary: draft.boundary,
          pins: draft.pins,
        },
      });
    }

    if (wizardStep === 2) {
      return persistStage(3, 4, {
        crops: [
          {
            cropCode: draft.cropCode,
            cropName: draft.cropName,
            cultivatedAreaHa: draft.areaHectares,
            areaUnit: "ha",
            plotCount: 1,
            irrigationMethod: draft.irrigationMethod,
          },
        ],
        primaryCropCode: draft.cropCode,
        plantingMonth: draft.plantingMonth,
        soilTexture: draft.soilTexture,
      });
    }
  };

  const handleFinish = async (draft: WizardSubmitPayload) => {
    setError(null);
    setSubmitting(true);
    try {
      const fid =
        (await handleSaveStep(1, draft)) ||
        activeFarmIdState;

      // Save step 2 crops and step 3 water + solar via existing onboarding API
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 3,
          nextStep: 4,
          farmId: fid,
          crops: [
            {
              cropCode: draft.cropCode,
              cropName: draft.cropName,
              cultivatedAreaHa: draft.areaHectares,
              areaUnit: "ha",
              plotCount: 1,
              irrigationMethod: draft.irrigationMethod,
            },
          ],
          primaryCropCode: draft.cropCode,
          plantingMonth: draft.plantingMonth,
          soilTexture: draft.soilTexture,
        }),
      });

      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          nextStep: 5,
          farmId: fid,
          waterSources: [
            {
              sourceType: draft.waterSourceType,
              wellDepthM: draft.wellDepthM,
              flowRateM3Hr: draft.flowRateM3Hr,
              isFarmerProvided: !draft.pumpIsEstimate,
            },
          ],
          irrigationMethod: draft.irrigationMethod,
          pump: {
            hasPump: draft.hasPump,
            flowRateM3Hr: draft.flowRateM3Hr,
            staticHeadM: draft.staticHeadM,
            pipeLengthM: draft.pipeLengthM,
            pipeDiameterMm: draft.pipeDiameterMm,
            pumpEfficiencyPct: draft.pumpEfficiencyPct,
            operatingHoursDay: draft.operatingHoursDay,
          },
        }),
      });

      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 5,
          nextStep: 6,
          farmId: fid,
          solar: {
            solarStatus: draft.solarStatus,
            capacityKwp: draft.capacityKwp,
            panelCount: draft.panelCount,
            panelWattageW: 500,
            tiltDeg: draft.tiltDeg,
            azimuthDeg: draft.azimuthDeg,
            systemLossPct: draft.systemLossPct,
            wantsEstimate: "YES",
          },
        }),
      });

      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId: fid, skipRemoteAnalysis: !isOnline }),
      });
      const completeJson = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeJson.error || "Could not finish setup.");
      }

      if (completeJson.farm?.id) setActiveFarmId(completeJson.farm.id);
      await queryClient.invalidateQueries({ queryKey: ["auth_session"] });
      await queryClient.invalidateQueries({ queryKey: ["farms"] });
      router.push(completeJson.redirectTo || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your farm.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !loaded) {
    return (
      <div className="min-h-screen bg-[var(--tp-bg-F6F4EE)] flex items-center justify-center gap-3 text-[18px] text-[var(--tp-fg-4A5A4F)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--tp-fg-2E6B3A)]" />
        <span>Loading your farm setup…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tp-bg-F6F4EE)] text-[var(--tp-fg-17251C)] px-5 py-6 lg:px-10 lg:py-8">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-[12px] bg-[var(--tp-bg-2E6B3A)] text-white flex items-center justify-center">
              <Sprout className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="m-0 text-[28px] lg:text-[34px] font-bold text-[var(--tp-fg-17251C)] leading-tight">
                {t.addFarmTitle}
              </h1>
              <p className="m-0 text-[16px] lg:text-[18px] text-[var(--tp-fg-4A5A4F)]">
                {t.threeShortSteps}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="min-h-[44px] px-4 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[15px] font-bold text-[var(--tp-fg-17251C)] no-underline inline-flex items-center gap-1.5"
            >
              <ArrowLeft className={isRtl ? "w-4 h-4 rotate-180" : "w-4 h-4"} />
              <span>Later</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="min-h-[44px] px-4 rounded-full border-[1.5px] border-[var(--tp-bd-C9C3B3)] bg-[var(--tp-bg-FFFFFF)] text-[15px] font-bold text-[var(--tp-fg-17251C)] inline-flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.signOut}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-[var(--tp-bg-FCEFD9)] border-2 border-[var(--tp-bd-E2B66B)] text-[var(--tp-fg-6B3A00)] rounded-[16px] px-4 py-3 text-[16px] font-bold">
            {error}
          </div>
        )}

        <ThreeStepFarmWizard
          mode="onboarding"
          initialFarm={activeFarm}
          onSaveStep={async (st, draft) => {
            await handleSaveStep(st, draft);
          }}
          onFinish={handleFinish}
          submitting={submitting}
          finishLabel="Finish and check my farm"
        />
      </div>
    </div>
  );
}
