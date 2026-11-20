import { beforeEach, describe, expect, it } from "vitest";
import {
  confirmPasswordReset,
  loginOrRegisterWithGoogle,
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
} from "@/lib/auth/service";
import {
  signSessionToken,
  verifySessionTokenWithStatus,
} from "@/lib/auth/session";
import { resetLocalDbForTests } from "@/lib/db/local-store";
import {
  deleteFarm,
  getFarmById,
  getFarmerProfile,
  getOnboardingProgress,
  listFarms,
  processSyncOperations,
  upsertFarm,
  upsertFarmerProfile,
  upsertOnboardingProgress,
} from "@/lib/db/repository";
import { CROP_DATABASE, calculateMultiCropWaterRequirements } from "@/lib/engines/fao56-calculator";
import {
  farmCropInputSchema,
  registerRequestSchema,
} from "@/lib/validation/schemas";

describe("Authentication, Authorization & 5-Stage Farmer Onboarding", () => {
  beforeEach(() => {
    resetLocalDbForTests();
  });

  it("registers with email/password, rejects duplicates, validates strong passwords, and routes to /onboarding", async () => {
    const weak = registerRequestSchema.safeParse({
      firstName: "Amine",
      lastName: "Trabelsi",
      email: "amine@tunisia.tn",
      password: "weak",
    });
    expect(weak.success).toBe(false);

    const outcome = await registerWithEmail({
      firstName: "Amine",
      lastName: "Trabelsi",
      email: "amine@tunisia.tn",
      password: "SecureFarm2026",
    });

    expect(outcome.user.email).toBe("amine@tunisia.tn");
    expect(outcome.onboardingCompleted).toBe(false);
    expect(outcome.redirectTo).toBe("/onboarding");

    await expect(
      registerWithEmail({
        firstName: "Amine",
        lastName: "Duplicate",
        email: "AMINE@tunisia.tn",
        password: "SecureFarm2026",
      })
    ).rejects.toThrow("DUPLICATE_EMAIL");
  });

  it("supports login, Google OAuth account linking/creation, and session expiration handling", async () => {
    await registerWithEmail({
      firstName: "Salma",
      lastName: "Gharbi",
      email: "salma@nabeul.tn",
      password: "OliveGrove99",
    });

    await expect(
      loginWithEmail({ email: "salma@nabeul.tn", password: "WrongPassword1" })
    ).rejects.toThrow("INVALID_CREDENTIALS");

    const loginRes = await loginWithEmail({
      email: "salma@nabeul.tn",
      password: "OliveGrove99",
    });
    expect(loginRes.redirectTo).toBe("/onboarding");

    const googleNew = await loginOrRegisterWithGoogle({
      email: "youssef.google@gmail.com",
      name: "Youssef Khelifi",
      googleId: "google_sub_12345",
    });
    expect(googleNew.user.email).toBe("youssef.google@gmail.com");
    expect(googleNew.redirectTo).toBe("/onboarding");

    // Expired token detection
    const expiredToken = signSessionToken(googleNew.user, -1000);
    const verified = verifySessionTokenWithStatus(expiredToken);
    expect(verified.user).toBeNull();
    expect(verified.expired).toBe(true);
  });

  it("supports password recovery code generation and password reset", async () => {
    await registerWithEmail({
      firstName: "Karim",
      lastName: "Miled",
      email: "karim@sfax.tn",
      password: "InitialPass1",
    });

    const resetReq = await requestPasswordReset("karim@sfax.tn");
    expect(resetReq.accepted).toBe(true);
    expect(resetReq.devResetCode).toBeTruthy();

    const changed = await confirmPasswordReset({
      token: resetReq.devResetCode!,
      newPassword: "UpdatedPass2026",
    });
    expect(changed).toBe(true);

    const relogin = await loginWithEmail({
      email: "karim@sfax.tn",
      password: "UpdatedPass2026",
    });
    expect(relogin.user.email).toBe("karim@sfax.tn");
  });

  it("enforces strict per-farmer private data ownership and authorization", async () => {
    const farmerA = await registerWithEmail({
      firstName: "Farmer",
      lastName: "Alpha",
      email: "alpha@farm.tn",
      password: "AlphaPass2026",
    });
    const farmerB = await registerWithEmail({
      firstName: "Farmer",
      lastName: "Beta",
      email: "beta@farm.tn",
      password: "BetaPass2026",
    });

    const farmA = await upsertFarm({
      userId: farmerA.user.id,
      name: "Alpha Private Farm",
      centerLat: 36.45,
      centerLon: 10.73,
      areaHectares: 5,
    });

    expect((await listFarms(farmerB.user.id)).some((f) => f.id === farmA.id)).toBe(false);
    expect(await getFarmById(farmA.id, farmerB.user.id)).toBeNull();
    await expect(deleteFarm(farmA.id, farmerB.user.id)).rejects.toThrow("Forbidden");
  });

  it("persists all 5 onboarding stages, supports resume after refresh without duplicates, and completes full journey", async () => {
    const reg = await registerWithEmail({
      firstName: "Nabil",
      lastName: "Jaziri",
      email: "nabil@kairouan.tn",
      password: "Kairouan2026",
    });
    const uid = reg.user.id;

    // Stage 1: Profile
    await upsertFarmerProfile(uid, {
      firstName: "Nabil",
      lastName: "Jaziri",
      email: reg.user.email,
      phone: "+216 98 123 456",
      country: "Tunisia",
      governorate: "Kairouan",
      delegation: "Sbikha",
      locality: "El Alam",
      preferredLanguage: "fr",
      preferredUnits: "metric",
      experienceLevel: "YEARS_5_10",
      activityType: "SMALL_FAMILY_FARM",
    });
    await upsertOnboardingProgress(uid, { currentStep: 2, completedSteps: [1] });

    // Resume check
    const resumed = await getOnboardingProgress(uid);
    expect(resumed.currentStep).toBe(2);
    expect(resumed.completedSteps).toEqual([1]);
    expect((await getFarmerProfile(uid))?.governorate).toBe("Kairouan");

    // Stage 2: Farm + Boundary (no duplicate on retry/update)
    const farm = await upsertFarm({
      id: `farm_onb_${uid}`,
      userId: uid,
      name: "Ferme El Alam",
      country: "Tunisia",
      governorate: "Kairouan",
      delegation: "Sbikha",
      centerLat: 35.93,
      centerLon: 10.02,
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [10.018, 35.932],
            [10.0205, 35.932],
            [10.0205, 35.9298],
            [10.018, 35.9298],
            [10.018, 35.932],
          ],
        ],
      },
    });
    await upsertOnboardingProgress(uid, {
      activeFarmId: farm.id,
      currentStep: 3,
      completedSteps: [2],
    });

    // Retry Stage 2 update with same farm ID must not duplicate farms
    await upsertFarm({
      id: farm.id,
      userId: uid,
      name: "Ferme El Alam Updated",
      centerLat: 35.93,
      centerLon: 10.02,
    });
    expect(await listFarms(uid)).toHaveLength(1);

    // Stage 3: Tunisian crops & multi-crop FAO-56 calculation
    expect(CROP_DATABASE.some((c) => c.code === "olive")).toBe(true);
    expect(CROP_DATABASE.some((c) => c.code === "barley")).toBe(true);
    expect(CROP_DATABASE.some((c) => c.code === "onion")).toBe(true);
    expect(CROP_DATABASE.some((c) => c.code === "pepper")).toBe(true);
    expect(CROP_DATABASE.some((c) => c.code === "watermelon")).toBe(true);
    expect(CROP_DATABASE.some((c) => c.code === "almond")).toBe(true);

    const cropValidation = farmCropInputSchema.safeParse({
      cropCode: "olive",
      cropName: "Olive Grove",
      cultivatedAreaHa: 3,
      irrigationMethod: "DRIP",
    });
    expect(cropValidation.success).toBe(true);

    const updatedWithCrops = await upsertFarm({
      id: farm.id,
      userId: uid,
      name: "Ferme El Alam Updated",
      centerLat: 35.93,
      centerLon: 10.02,
      crops: [
        {
          id: "c1",
          farmId: farm.id,
          cropCode: "olive",
          cropName: "Olive Grove",
          cultivatedAreaHa: 3,
          areaUnit: "ha",
          plotCount: 1,
          irrigationMethod: "DRIP",
        },
        {
          id: "c2",
          farmId: farm.id,
          cropCode: "tomato",
          cropName: "Field Tomato",
          cultivatedAreaHa: 1,
          areaUnit: "ha",
          plotCount: 1,
          irrigationMethod: "DRIP",
        },
      ],
    });
    expect(updatedWithCrops.crops).toHaveLength(2);

    const sampleMonthly = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      monthName: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
      tempMinAvgC: 10,
      tempMaxAvgC: 26,
      tempMeanAvgC: 18,
      precipSumMm: 25,
      et0SumMm: 120,
      radiationAvgMjM2Day: 18,
      rainyDays: 3,
      waterBalanceMm: -95,
      growingDegreeDays: 240,
    }));
    const multiCropWater = calculateMultiCropWaterRequirements({
      farmCrops: updatedWithCrops.crops!,
      monthlyClimate: sampleMonthly,
    });
    expect(multiCropWater?.irrigatedAreaHa).toBeCloseTo(4, 1);

    // Stage 4 & 5: Water, Pump & Solar (farmer-provided vs estimated flags)
    const finalFarm = await upsertFarm({
      id: farm.id,
      userId: uid,
      name: "Ferme El Alam Updated",
      centerLat: 35.93,
      centerLon: 10.02,
      farmerWaterSources: [
        {
          id: "ws1",
          farmId: farm.id,
          sourceType: "BOREHOLE",
          wellDepthM: 85,
          flowRateM3Hr: 18,
          isFarmerProvided: true,
        },
      ],
      pumpConfig: {
        hasPump: true,
        powerKw: 5.5,
        flowRateM3Hr: 18,
        operatingHoursDay: 6,
        isFarmerProvided: true,
      },
      solarConfig: {
        solarStatus: "PLANNING",
        wantsEstimate: "YES",
        budgetAmount: 25000,
        isFarmerProvided: false,
      },
    });
    expect(finalFarm.pumpConfig.isFarmerProvided).toBe(true);
    expect(finalFarm.solarConfig.isFarmerProvided).toBe(false);

    // Complete onboarding & verify login now routes straight to dashboard "/"
    await upsertOnboardingProgress(uid, {
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5],
      isCompleted: true,
      completedAt: new Date().toISOString(),
    });
    const relogin = await loginWithEmail({
      email: "nabil@kairouan.tn",
      password: "Kairouan2026",
    });
    expect(relogin.onboardingCompleted).toBe(true);
    expect(relogin.redirectTo).toBe("/");
  });

  it("synchronizes offline onboarding edits via processSyncOperations", async () => {
    const reg = await registerWithEmail({
      firstName: "Offline",
      lastName: "Farmer",
      email: "offline@gabes.tn",
      password: "OfflinePass2026",
    });

    const syncRes = await processSyncOperations(reg.user.id, [
      {
        operationId: "op_onb_offline_001",
        entityType: "ONBOARDING",
        entityId: reg.user.id,
        action: "UPDATE",
        clientTimestamp: new Date().toISOString(),
        payload: {
          profile: {
            firstName: "Offline",
            lastName: "Farmer",
            email: reg.user.email,
            country: "Tunisia",
            governorate: "Gabes",
          },
          progress: {
            currentStep: 2,
            completedSteps: [1],
          },
        },
      },
    ]);

    expect(syncRes[0].status).toBe("APPLIED");
    expect((await getFarmerProfile(reg.user.id))?.governorate).toBe("Gabes");
    expect((await getOnboardingProgress(reg.user.id)).currentStep).toBe(2);
  });
});
