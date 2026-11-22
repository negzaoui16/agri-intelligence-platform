/**
 * Postgres (Supabase + PostGIS) persistence layer.
 *
 * When DATABASE_URL is set, Postgres is the source of truth: every FarmRecord field,
 * user account, farmer profile, onboarding progress, report and AI conversation is
 * written here first, and reads come from here. Errors are thrown (never swallowed)
 * so an API call can't report success for data that was never saved.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AIChatMessageRecord,
  FarmBrainAnalysisRecord,
  FarmBrainCompletenessItem,
  FarmBrainDailyMoistureForecastPoint,
  FarmBrainExplainableAdvice,
  FarmBrainPlotBreakdown,
  FarmBrainSavingsBreakdown,
  FarmBrainVerifiedSavingsTracking,
  FarmCropRecord,
  FarmerProfileRecord,
  FarmerWaterSourceRecord,
  FarmRecord,
  FarmSensorsBundle,
  FeasibilityReportPayload,
  GeoPolygon,
  IrrigationMethod,
  MLModelMetadataRecord,
  MLPredictionLogRecord,
  OnboardingProgressRecord,
  SensorDevicePublicRecord,
  SensorDeviceRecord,
  SensorReadingRecord,
  SimulationScenarioInputs,
  SimulationScenarioRecord,
  SimulationScenarioResult,
  UserAccountRecord,
} from "@/types/agri";
import { IRRIGATION_EFFICIENCY_DEFAULTS, SOIL_TEXTURE_DEFAULTS } from "./defaults";

type Tx = Prisma.TransactionClient;

const farmInclude = {
  boundary: true,
  locations: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  soilProfile: true,
  solarConfig: true,
  pumpConfig: true,
  farmCrops: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  waterConfigurations: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.FarmInclude;

type FarmRow = Prisma.FarmGetPayload<{ include: typeof farmInclude }>;

/** Child rows share global primary keys, but client ids (e.g. `pin_<timestamp>`) are only unique per farm. */
export function scopedChildId(farmId: string, id: string): string {
  return id.startsWith(`${farmId}__`) ? id : `${farmId}__${id}`;
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Shown to API callers; the underlying database error is logged server-side only. */
export class DatabaseWriteError extends Error {
  readonly operation: string;
  constructor(operation: string) {
    super("Could not save your changes to the database. Please try again.");
    this.name = "DatabaseWriteError";
    this.operation = operation;
  }
}

export function isUniqueViolation(err: unknown, field?: string): boolean {
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== "P2002") return false;
  if (!field) return true;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}

// ---------------------------------------------------------------------------
// Farms
// ---------------------------------------------------------------------------

export function farmRowToRecord(row: FarmRow): FarmRecord {
  const irrigationMethod = row.irrigationMethod as IrrigationMethod;
  const soil = row.soilProfile;
  const solar = row.solarConfig;
  const pump = row.pumpConfig;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    country: row.country,
    region: row.region,
    governorate: row.governorate,
    delegation: row.delegation,
    locality: row.locality,
    centerLat: row.centerLat,
    centerLon: row.centerLon,
    elevationM: row.elevationM,
    areaHectares: row.areaHectares,
    perimeterMeters: row.perimeterMeters,
    boundary: (row.boundary?.geojson as unknown as GeoPolygon) ?? null,
    boundaryVerified: row.boundaryVerified,
    pins: row.locations.map((p) => ({
      id: p.id,
      farmId: p.farmId,
      label: p.label,
      role: p.role,
      latitude: p.latitude,
      longitude: p.longitude,
      elevationM: p.elevationM,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
    crops: row.farmCrops.map(
      (c): FarmCropRecord => ({
        id: c.id,
        farmId: c.farmId,
        cropCode: c.cropCode,
        cropName: c.cropName,
        cultivatedAreaHa: c.cultivatedAreaHa,
        areaUnit: c.areaUnit === "m2" ? "m2" : "ha",
        plantingDate: c.plantingDate,
        growthStage: c.growthStage,
        plotCount: c.plotCount,
        plantingDensity: c.plantingDensity,
        irrigationMethod: c.irrigationMethod as IrrigationMethod,
      })
    ),
    allowCropOverlap: row.allowCropOverlap,
    farmerWaterSources: row.waterConfigurations.map(
      (w): FarmerWaterSourceRecord => ({
        id: w.id,
        farmId: w.farmId,
        sourceType: w.sourceType as FarmerWaterSourceRecord["sourceType"],
        latitude: w.latitude,
        longitude: w.longitude,
        distanceMeters: w.distanceMeters,
        availability: w.availability,
        wellDepthM: w.wellDepthM,
        flowRateM3Hr: w.flowRateM3Hr,
        waterQualityNotes: w.waterQualityNotes,
        isFarmerProvided: w.isFarmerProvided,
      })
    ),
    soilProfile: soil
      ? {
          textureClass: soil.textureClass,
          fieldCapacityMmM: soil.fieldCapacityMmM,
          wiltingPointMmM: soil.wiltingPointMmM,
          tawMmM: soil.tawMmM,
          infiltrationRateMmHr: soil.infiltrationRateMmHr,
          organicMatterPct: soil.organicMatterPct,
          ph: soil.ph,
          source: soil.source,
          updatedAt: soil.updatedAt.toISOString(),
        }
      : {
          ...SOIL_TEXTURE_DEFAULTS.LOAM,
          source: "Default Loam Profile",
          updatedAt: row.updatedAt.toISOString(),
        },
    solarConfig: solar
      ? {
          solarStatus: solar.solarStatus as FarmRecord["solarConfig"]["solarStatus"],
          capacityKwp: solar.capacityKwp,
          panelCount: solar.panelCount,
          panelWattageW: solar.panelWattageW,
          tiltDeg: solar.tiltDeg,
          azimuthDeg: solar.azimuthDeg,
          mountingType: solar.mountingType === "building" ? "building" : "free",
          systemLossPct: solar.systemLossPct,
          optimizeAngles: solar.optimizeAngles,
          hasBattery: solar.hasBattery,
          batteryCapacityKwh: solar.batteryCapacityKwh,
          hasGridConnection: solar.hasGridConnection,
          wantsEstimate: (solar.wantsEstimate ?? undefined) as FarmRecord["solarConfig"]["wantsEstimate"],
          budgetAmount: solar.budgetAmount,
          isFarmerProvided: solar.isFarmerProvided,
          updatedAt: solar.updatedAt.toISOString(),
        }
      : {
          capacityKwp: 5,
          tiltDeg: 30,
          azimuthDeg: 0,
          mountingType: "free",
          systemLossPct: 14,
          optimizeAngles: false,
          updatedAt: row.updatedAt.toISOString(),
        },
    pumpConfig: pump
      ? {
          hasPump: pump.hasPump,
          pumpType: pump.pumpType,
          powerKw: pump.powerKw,
          flowRateM3Hr: pump.flowRateM3Hr,
          staticHeadM: pump.staticHeadM,
          pipeLengthM: pump.pipeLengthM,
          pipeDiameterMm: pump.pipeDiameterMm,
          pipeMaterialC: pump.pipeMaterialC,
          frictionLossM: pump.frictionLossM,
          operatingPressureHeadM: pump.operatingPressureHeadM,
          totalDynamicHeadM: pump.totalDynamicHeadM,
          pumpEfficiencyPct: pump.pumpEfficiencyPct,
          motorEfficiencyPct: pump.motorEfficiencyPct,
          operatingHoursDay: pump.operatingHoursDay,
          isFarmerProvided: pump.isFarmerProvided,
          updatedAt: pump.updatedAt.toISOString(),
        }
      : {
          flowRateM3Hr: 18,
          staticHeadM: 15,
          pipeLengthM: 150,
          pipeDiameterMm: 75,
          pipeMaterialC: 140,
          frictionLossM: 4.2,
          operatingPressureHeadM: 15,
          totalDynamicHeadM: 34.2,
          pumpEfficiencyPct: 65,
          motorEfficiencyPct: 88,
          operatingHoursDay: 6,
          updatedAt: row.updatedAt.toISOString(),
        },
    // Irrigated area and efficiency are derived values, exactly as upsertFarm computes them
    irrigationConfig: {
      cropCode: row.primaryCropCode,
      irrigatedAreaHa: row.areaHectares,
      irrigationMethod,
      applicationEfficiencyPct: IRRIGATION_EFFICIENCY_DEFAULTS[irrigationMethod]?.efficiencyPct ?? 90,
      plantingMonth: row.plantingMonth,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function pgListFarms(prisma: PrismaClient, userId: string): Promise<FarmRecord[]> {
  const rows = await prisma.farm.findMany({
    where: { userId },
    include: farmInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(farmRowToRecord);
}

export async function pgGetFarm(prisma: PrismaClient, farmId: string): Promise<FarmRecord | null> {
  const row = await prisma.farm.findUnique({ where: { id: farmId }, include: farmInclude });
  return row ? farmRowToRecord(row) : null;
}

/**
 * Writes the complete farm record in one transaction. Child collections (pins, crops,
 * farmer water sources) are replaced wholesale from the record. Returns the record as
 * stored (child ids are farm-scoped).
 */
export async function pgSaveFarm(prisma: PrismaClient, record: FarmRecord): Promise<FarmRecord> {
  const farmId = record.id;
  const updatedAt = new Date(record.updatedAt);
  const farmData = {
    name: record.name,
    description: record.description ?? null,
    country: record.country ?? null,
    region: record.region ?? null,
    governorate: record.governorate ?? null,
    delegation: record.delegation ?? null,
    locality: record.locality ?? null,
    centerLat: record.centerLat,
    centerLon: record.centerLon,
    elevationM: record.elevationM ?? null,
    areaHectares: record.areaHectares,
    perimeterMeters: record.perimeterMeters,
    boundaryVerified: record.boundaryVerified ?? record.boundary != null,
    primaryCropCode: record.irrigationConfig.cropCode,
    plantingMonth: record.irrigationConfig.plantingMonth,
    irrigationMethod: record.irrigationConfig.irrigationMethod,
    allowCropOverlap: record.allowCropOverlap ?? false,
    updatedAt,
  };

  await prisma.$transaction(async (tx: Tx) => {
    await tx.farm.upsert({
      where: { id: farmId },
      update: farmData,
      create: { id: farmId, userId: record.userId, createdAt: new Date(record.createdAt), ...farmData },
    });

    // Boundary (PostGIS polygon)
    if (record.boundary) {
      const geojson = JSON.stringify(record.boundary);
      await tx.$executeRaw`
        INSERT INTO "FarmBoundary" ("id", "farmId", "geojson", "areaHectares", "perimeterMeters", "geom", "updatedAt")
        VALUES (${`bnd_${farmId}`}, ${farmId}, ${geojson}::jsonb, ${record.areaHectares}, ${record.perimeterMeters},
                ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), NOW())
        ON CONFLICT ("farmId") DO UPDATE SET
          "geojson" = EXCLUDED."geojson",
          "areaHectares" = EXCLUDED."areaHectares",
          "perimeterMeters" = EXCLUDED."perimeterMeters",
          "geom" = EXCLUDED."geom",
          "updatedAt" = NOW()`;
    } else {
      await tx.farmBoundary.deleteMany({ where: { farmId } });
    }

    // Pins (PostGIS points)
    await tx.farmLocation.deleteMany({ where: { farmId } });
    if (record.pins.length) {
      await tx.farmLocation.createMany({
        data: record.pins.map((p) => ({
          id: scopedChildId(farmId, p.id),
          farmId,
          label: p.label,
          role: p.role,
          latitude: p.latitude,
          longitude: p.longitude,
          elevationM: p.elevationM ?? null,
          notes: p.notes ?? null,
          createdAt: new Date(p.createdAt),
        })),
      });
      await tx.$executeRaw`
        UPDATE "FarmLocation"
        SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)
        WHERE "farmId" = ${farmId}`;
    }

    // Soil, solar, pump (one row each)
    const soil = record.soilProfile;
    const soilData = {
      textureClass: soil.textureClass,
      fieldCapacityMmM: soil.fieldCapacityMmM,
      wiltingPointMmM: soil.wiltingPointMmM,
      tawMmM: soil.tawMmM,
      infiltrationRateMmHr: soil.infiltrationRateMmHr,
      organicMatterPct: soil.organicMatterPct ?? null,
      ph: soil.ph ?? null,
      source: soil.source,
      updatedAt: new Date(soil.updatedAt),
    };
    await tx.soilProfile.upsert({
      where: { farmId },
      update: soilData,
      create: { id: `soil_${farmId}`, farmId, ...soilData },
    });

    const solar = record.solarConfig;
    const solarData = {
      solarStatus: solar.solarStatus ?? "NOT_SURE",
      capacityKwp: solar.capacityKwp,
      panelCount: solar.panelCount ?? null,
      panelWattageW: solar.panelWattageW ?? null,
      tiltDeg: solar.tiltDeg,
      azimuthDeg: solar.azimuthDeg,
      mountingType: solar.mountingType,
      systemLossPct: solar.systemLossPct,
      optimizeAngles: solar.optimizeAngles,
      hasBattery: solar.hasBattery ?? false,
      batteryCapacityKwh: solar.batteryCapacityKwh ?? null,
      hasGridConnection: solar.hasGridConnection ?? false,
      wantsEstimate: solar.wantsEstimate ?? null,
      budgetAmount: solar.budgetAmount ?? null,
      isFarmerProvided: solar.isFarmerProvided ?? false,
      updatedAt: new Date(solar.updatedAt),
    };
    await tx.solarConfiguration.upsert({
      where: { farmId },
      update: solarData,
      create: { id: `solar_${farmId}`, farmId, ...solarData },
    });

    const pump = record.pumpConfig;
    const pumpData = {
      hasPump: pump.hasPump ?? true,
      pumpType: pump.pumpType ?? null,
      powerKw: pump.powerKw ?? null,
      flowRateM3Hr: pump.flowRateM3Hr,
      staticHeadM: pump.staticHeadM,
      pipeLengthM: pump.pipeLengthM,
      pipeDiameterMm: pump.pipeDiameterMm,
      pipeMaterialC: pump.pipeMaterialC,
      frictionLossM: pump.frictionLossM,
      operatingPressureHeadM: pump.operatingPressureHeadM,
      totalDynamicHeadM: pump.totalDynamicHeadM,
      pumpEfficiencyPct: pump.pumpEfficiencyPct,
      motorEfficiencyPct: pump.motorEfficiencyPct,
      operatingHoursDay: pump.operatingHoursDay,
      isFarmerProvided: pump.isFarmerProvided ?? false,
      updatedAt: new Date(pump.updatedAt),
    };
    await tx.pumpConfiguration.upsert({
      where: { farmId },
      update: pumpData,
      create: { id: `pump_${farmId}`, farmId, ...pumpData },
    });

    // Crops
    await tx.farmCrop.deleteMany({ where: { farmId } });
    const crops = record.crops ?? [];
    if (crops.length) {
      await tx.farmCrop.createMany({
        data: crops.map((c, idx) => ({
          id: scopedChildId(farmId, c.id),
          farmId,
          cropCode: c.cropCode,
          cropName: c.cropName,
          cultivatedAreaHa: c.cultivatedAreaHa,
          areaUnit: c.areaUnit,
          plantingDate: c.plantingDate ?? null,
          growthStage: c.growthStage ?? null,
          plotCount: c.plotCount,
          plantingDensity: c.plantingDensity ?? null,
          irrigationMethod: c.irrigationMethod,
          // keep insertion order stable for reads
          createdAt: new Date(updatedAt.getTime() + idx),
          updatedAt,
        })),
      });
    }

    // Farmer-reported water sources (PostGIS points when coordinates are known)
    await tx.waterConfiguration.deleteMany({ where: { farmId } });
    const sources = record.farmerWaterSources ?? [];
    if (sources.length) {
      await tx.waterConfiguration.createMany({
        data: sources.map((w, idx) => ({
          id: scopedChildId(farmId, w.id),
          farmId,
          sourceType: w.sourceType,
          latitude: w.latitude ?? null,
          longitude: w.longitude ?? null,
          distanceMeters: w.distanceMeters ?? null,
          availability: w.availability ?? null,
          wellDepthM: w.wellDepthM ?? null,
          flowRateM3Hr: w.flowRateM3Hr ?? null,
          waterQualityNotes: w.waterQualityNotes ?? null,
          isFarmerProvided: w.isFarmerProvided,
          createdAt: new Date(updatedAt.getTime() + idx),
        })),
      });
      await tx.$executeRaw`
        UPDATE "WaterConfiguration"
        SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)
        WHERE "farmId" = ${farmId} AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL`;
    }
  });

  const stored = await pgGetFarm(prisma, farmId);
  if (!stored) throw new Error(`Farm ${farmId} missing after save`);
  return stored;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function pgSaveReport(prisma: PrismaClient, report: FeasibilityReportPayload): Promise<void> {
  const data = {
    farmId: report.farmId,
    title: report.title,
    overallScore: report.overallScore,
    verdict: report.verdict,
    reportJson: report as unknown as Prisma.InputJsonValue,
    sourcesJson: (report.sources ?? []) as unknown as Prisma.InputJsonValue,
    uncertaintiesJson: (report.uncertainties ?? []) as unknown as Prisma.InputJsonValue,
  };
  await prisma.feasibilityReport.upsert({
    where: { id: report.id },
    update: data,
    create: { id: report.id, ...data },
  });
}

export async function pgListReports(
  prisma: PrismaClient,
  opts: { farmId?: string; ownerUserId?: string }
): Promise<FeasibilityReportPayload[]> {
  const rows = await prisma.feasibilityReport.findMany({
    where: {
      ...(opts.farmId ? { farmId: opts.farmId } : {}),
      ...(opts.ownerUserId ? { farm: { userId: opts.ownerUserId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => r.reportJson as unknown as FeasibilityReportPayload);
}

// ---------------------------------------------------------------------------
// AI conversations (one per user + farm)
// ---------------------------------------------------------------------------

export function conversationId(userId: string, farmId?: string | null): string {
  return farmId ? `conv_${userId}_${farmId}` : `conv_${userId}_general`;
}

export async function pgAppendConversation(
  prisma: PrismaClient,
  userId: string,
  farmId: string | undefined,
  messages: AIChatMessageRecord[]
): Promise<void> {
  const id = conversationId(userId, farmId);
  await prisma.$transaction(async (tx: Tx) => {
    await tx.aIConversation.upsert({
      where: { id },
      update: { updatedAt: new Date() },
      create: {
        id,
        userId,
        farmId: farmId ?? null,
        title: farmId ? `Agronomy Consultation (${farmId})` : "General Agronomy Consultation",
      },
    });
    await tx.aIMessage.createMany({
      data: messages.map((m) => ({
        id: `${id}__${m.id}`,
        conversationId: id,
        role: m.role,
        content: m.content,
        toolCallsJson: {
          toolCalls: m.toolCalls ?? [],
          modelUsed: m.modelUsed ?? null,
        } as unknown as Prisma.InputJsonValue,
        citationsJson: (m.citations ?? []) as unknown as Prisma.InputJsonValue,
        createdAt: new Date(m.createdAt),
      })),
      skipDuplicates: true,
    });
  });
}

export async function pgGetConversation(
  prisma: PrismaClient,
  userId: string,
  farmId?: string
): Promise<AIChatMessageRecord[]> {
  const rows = await prisma.aIMessage.findMany({
    where: { conversationId: conversationId(userId, farmId) },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.reverse().map((m) => {
    const extra = (m.toolCallsJson ?? {}) as { toolCalls?: AIChatMessageRecord["toolCalls"]; modelUsed?: string | null };
    return {
      id: m.id.split("__").pop() ?? m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      toolCalls: extra.toolCalls ?? [],
      citations: (m.citationsJson ?? []) as unknown as AIChatMessageRecord["citations"],
      modelUsed: extra.modelUsed ?? undefined,
      createdAt: m.createdAt.toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Users, farmer profiles, onboarding
// ---------------------------------------------------------------------------

type UserRow = Prisma.UserGetPayload<object>;

export function userRowToRecord(u: UserRow): UserAccountRecord {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash,
    role: (u.role as UserAccountRecord["role"]) ?? "FARMER",
    authProvider: u.authProvider === "GOOGLE" ? "GOOGLE" : "EMAIL",
    googleId: u.googleId,
    emailVerified: u.emailVerified,
    resetTokenHash: u.resetTokenHash,
    resetTokenExpiresAt: iso(u.resetTokenExpiresAt),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export function userRecordToData(u: UserAccountRecord) {
  return {
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash,
    role: u.role,
    authProvider: u.authProvider,
    googleId: u.googleId ?? null,
    emailVerified: u.emailVerified,
    resetTokenHash: u.resetTokenHash ?? null,
    resetTokenExpiresAt: u.resetTokenExpiresAt ? new Date(u.resetTokenExpiresAt) : null,
  };
}

export async function pgSaveUser(prisma: PrismaClient, u: UserAccountRecord): Promise<void> {
  const data = userRecordToData(u);
  await prisma.user.upsert({
    where: { id: u.id },
    update: data,
    create: { id: u.id, createdAt: new Date(u.createdAt), ...data },
  });
}

type ProfileRow = Prisma.FarmerProfileGetPayload<{ include: { user: true } }>;

export function profileRowToRecord(p: ProfileRow): FarmerProfileRecord {
  return {
    id: p.id,
    userId: p.userId,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    email: p.user.email,
    avatarUrl: p.avatarUrl,
    country: p.country,
    governorate: p.governorate,
    delegation: p.delegation,
    locality: p.locality,
    preferredLanguage: p.preferredLanguage as FarmerProfileRecord["preferredLanguage"],
    preferredUnits: p.preferredUnits as FarmerProfileRecord["preferredUnits"],
    experienceLevel: p.experienceLevel as FarmerProfileRecord["experienceLevel"],
    activityType: p.activityType as FarmerProfileRecord["activityType"],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function pgSaveProfile(prisma: PrismaClient, p: FarmerProfileRecord): Promise<void> {
  const data = {
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone ?? null,
    avatarUrl: p.avatarUrl ?? null,
    country: p.country,
    governorate: p.governorate ?? null,
    delegation: p.delegation ?? null,
    locality: p.locality ?? null,
    preferredLanguage: p.preferredLanguage,
    preferredUnits: p.preferredUnits,
    experienceLevel: p.experienceLevel,
    activityType: p.activityType,
  };
  await prisma.farmerProfile.upsert({
    where: { userId: p.userId },
    update: data,
    create: { id: p.id, userId: p.userId, createdAt: new Date(p.createdAt), ...data },
  });
}

type ProgressRow = Prisma.OnboardingProgressGetPayload<object>;

export function progressRowToRecord(o: ProgressRow): OnboardingProgressRecord {
  return {
    id: o.id,
    userId: o.userId,
    activeFarmId: o.activeFarmId,
    currentStep: o.currentStep,
    completedSteps: Array.isArray(o.completedSteps) ? (o.completedSteps as number[]) : [],
    isCompleted: o.isCompleted,
    completedAt: iso(o.completedAt),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export async function pgSaveProgress(prisma: PrismaClient, o: OnboardingProgressRecord): Promise<void> {
  const data = {
    activeFarmId: o.activeFarmId ?? null,
    currentStep: o.currentStep,
    completedSteps: o.completedSteps,
    isCompleted: o.isCompleted,
    completedAt: o.completedAt ? new Date(o.completedAt) : null,
  };
  await prisma.onboardingProgress.upsert({
    where: { userId: o.userId },
    update: data,
    create: { id: o.id, userId: o.userId, ...data },
  });
}

// ---------------------------------------------------------------------------
// ESP32 Sensor Devices & Readings
// ---------------------------------------------------------------------------

type SensorDeviceRow = Prisma.SensorDeviceGetPayload<object>;
type SensorReadingRow = Prisma.SensorReadingGetPayload<object>;

export function isMissingSensorTableError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === "P2021") return true;
  const msg = String(e?.message ?? "");
  return msg.includes("SensorDevice") || msg.includes("SensorReading");
}

function sensorDeviceRowToRecord(row: SensorDeviceRow): SensorDeviceRecord {
  return {
    id: row.id,
    farmId: row.farmId,
    name: row.name,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: iso(row.lastSeenAt),
    revokedAt: iso(row.revokedAt),
  };
}

function sensorReadingRowToRecord(row: SensorReadingRow): SensorReadingRecord {
  return {
    id: row.id,
    deviceId: row.deviceId,
    farmId: row.farmId,
    recordedAt: row.recordedAt.toISOString(),
    receivedAt: row.receivedAt.toISOString(),
    airTempC: row.airTempC,
    airHumidityPct: row.airHumidityPct,
    soilMoisturePct: row.soilMoisturePct,
    soilRaw: row.soilRaw,
    waterLevelPct: row.waterLevelPct,
    waterRaw: row.waterRaw,
    pumpOn: row.pumpOn,
    soilFault: row.soilFault,
  };
}

export async function pgCreateSensorDevice(
  prisma: PrismaClient,
  device: SensorDeviceRecord
): Promise<SensorDeviceRecord> {
  const row = await prisma.sensorDevice.create({
    data: {
      id: device.id,
      farmId: device.farmId,
      name: device.name,
      tokenHash: device.tokenHash,
      createdAt: new Date(device.createdAt),
      lastSeenAt: device.lastSeenAt ? new Date(device.lastSeenAt) : null,
      revokedAt: device.revokedAt ? new Date(device.revokedAt) : null,
    },
  });
  return sensorDeviceRowToRecord(row);
}

export async function pgListSensorDevices(
  prisma: PrismaClient,
  farmId: string
): Promise<SensorDeviceRecord[]> {
  const rows = await prisma.sensorDevice.findMany({
    where: { farmId, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(sensorDeviceRowToRecord);
}

export async function pgFindSensorDeviceByTokenHash(
  prisma: PrismaClient,
  tokenHash: string
): Promise<SensorDeviceRecord | null> {
  const row = await prisma.sensorDevice.findUnique({ where: { tokenHash } });
  return row ? sensorDeviceRowToRecord(row) : null;
}

export async function pgRevokeSensorDevice(
  prisma: PrismaClient,
  farmId: string,
  deviceId: string,
  revokedAt: string
): Promise<boolean> {
  const res = await prisma.sensorDevice.updateMany({
    where: { id: deviceId, farmId, revokedAt: null },
    data: { revokedAt: new Date(revokedAt) },
  });
  return res.count > 0;
}

export async function pgInsertSensorReadings(
  prisma: PrismaClient,
  deviceId: string,
  farmId: string,
  readings: SensorReadingRecord[],
  lastSeenAt: string
): Promise<SensorReadingRecord[]> {
  await prisma.$transaction(async (tx: Tx) => {
    await tx.sensorReading.createMany({
      data: readings.map((r) => ({
        id: r.id,
        deviceId: r.deviceId,
        farmId: r.farmId,
        recordedAt: new Date(r.recordedAt),
        receivedAt: new Date(r.receivedAt),
        airTempC: r.airTempC,
        airHumidityPct: r.airHumidityPct,
        soilMoisturePct: r.soilMoisturePct,
        soilRaw: r.soilRaw,
        waterLevelPct: r.waterLevelPct,
        waterRaw: r.waterRaw,
        pumpOn: r.pumpOn,
        soilFault: r.soilFault,
      })),
    });
    await tx.sensorDevice.updateMany({
      where: { id: deviceId, farmId },
      data: { lastSeenAt: new Date(lastSeenAt) },
    });
  });
  return readings;
}

export async function pgGetFarmSensorsBundle(
  prisma: PrismaClient,
  farmId: string,
  since24hIso: string
): Promise<FarmSensorsBundle> {
  const deviceRows = await prisma.sensorDevice.findMany({
    where: { farmId, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const activeIds = deviceRows.map((d) => d.id);
  if (activeIds.length === 0) {
    return { farmId, devices: [], latestReading: null, readings24h: [] };
  }

  const [recentRows, latestPerDeviceRows] = await Promise.all([
    prisma.sensorReading.findMany({
      where: {
        farmId,
        deviceId: { in: activeIds },
        recordedAt: { gte: new Date(since24hIso) },
      },
      orderBy: [{ recordedAt: "desc" }, { receivedAt: "desc" }],
      take: 1500,
    }),
    Promise.all(
      activeIds.map((id) =>
        prisma.sensorReading.findFirst({
          where: { farmId, deviceId: id },
          orderBy: [{ recordedAt: "desc" }, { receivedAt: "desc" }],
        })
      )
    ),
  ]);

  const readings24h = recentRows.map(sensorReadingRowToRecord);
  const latestMap = new Map<string, SensorReadingRecord>();
  latestPerDeviceRows.forEach((row, idx) => {
    if (row) latestMap.set(activeIds[idx], sensorReadingRowToRecord(row));
  });

  const devices: SensorDevicePublicRecord[] = deviceRows.map((d) => ({
    id: d.id,
    farmId: d.farmId,
    name: d.name,
    createdAt: d.createdAt.toISOString(),
    lastSeenAt: iso(d.lastSeenAt),
    revokedAt: iso(d.revokedAt),
    latestReading: latestMap.get(d.id) ?? null,
  }));

  const sortedLatest = Array.from(latestMap.values()).sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return {
    farmId,
    devices,
    latestReading: sortedLatest[0] ?? null,
    readings24h,
  };
}

// ---------------------------------------------------------------------------
// FarmBrain Analyses, Simulator Scenarios & ML Metadata
// ---------------------------------------------------------------------------

type FarmBrainAnalysisRow = Prisma.FarmBrainAnalysisGetPayload<object>;
type SimulationScenarioRow = Prisma.SimulationScenarioGetPayload<object>;
type MLModelMetadataRow = Prisma.MLModelMetadataGetPayload<object>;

export function isMissingFarmBrainTableError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === "P2021" || e?.code === "P2022") return true;
  const msg = String(e?.message ?? "");
  return (
    msg.includes("FarmBrainAnalysis") ||
    msg.includes("SimulationScenario") ||
    msg.includes("MLModelMetadata") ||
    msg.includes("MLPredictionLog")
  );
}

function farmBrainRowToRecord(row: FarmBrainAnalysisRow): FarmBrainAnalysisRecord {
  return {
    id: row.id,
    farmId: row.farmId,
    userId: row.userId,
    version: row.version,
    dataCompletenessPct: row.dataCompletenessPct,
    completenessItems: row.completenessJson as unknown as FarmBrainCompletenessItem[],
    savings: row.savingsJson as unknown as FarmBrainSavingsBreakdown,
    verifiedTracking: row.verifiedTrackingJson as unknown as FarmBrainVerifiedSavingsTracking,
    soilMoistureForecast7d:
      row.forecastJson as unknown as FarmBrainDailyMoistureForecastPoint[],
    plotBreakdowns: row.plotBreakdownsJson as unknown as FarmBrainPlotBreakdown[],
    recommendations: row.recommendationsJson as unknown as FarmBrainExplainableAdvice[],
    soilAnomalyDetected: row.soilAnomalyDetected,
    soilAnomalyReason: row.soilAnomalyReason,
    mlModelsUsed: row.mlModelsJson as unknown as FarmBrainAnalysisRecord["mlModelsUsed"],
    assumptions: row.assumptionsJson as unknown as string[],
    limitations: row.limitationsJson as unknown as string[],
    generatedAt: row.generatedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function scenarioRowToRecord(row: SimulationScenarioRow): SimulationScenarioRecord {
  return {
    id: row.id,
    farmId: row.farmId,
    userId: row.userId,
    name: row.name,
    scenarioType: row.scenarioType,
    inputs: row.inputsJson as unknown as SimulationScenarioInputs,
    result: row.resultJson ? (row.resultJson as unknown as SimulationScenarioResult) : null,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastRunAt: iso(row.lastRunAt),
  };
}

function mlMetaRowToRecord(row: MLModelMetadataRow): MLModelMetadataRecord {
  return {
    id: row.id,
    modelName: row.modelName,
    algorithm: row.algorithm,
    version: row.version,
    targetVariable: row.targetVariable,
    mae: row.mae,
    rmse: row.rmse,
    r2: row.r2,
    trainSamples: row.trainSamples,
    testSamples: row.testSamples,
    featureNames: row.featureNames as unknown as string[],
    trainedAt: row.trainedAt.toISOString(),
  };
}

export async function pgSaveFarmBrainAnalysis(
  prisma: PrismaClient,
  record: FarmBrainAnalysisRecord
): Promise<FarmBrainAnalysisRecord> {
  const row = await prisma.farmBrainAnalysis.upsert({
    where: { id: record.id },
    update: {
      version: record.version,
      dataCompletenessPct: record.dataCompletenessPct,
      completenessJson: record.completenessItems as unknown as Prisma.InputJsonValue,
      savingsJson: record.savings as unknown as Prisma.InputJsonValue,
      verifiedTrackingJson: record.verifiedTracking as unknown as Prisma.InputJsonValue,
      forecastJson: record.soilMoistureForecast7d as unknown as Prisma.InputJsonValue,
      plotBreakdownsJson: record.plotBreakdowns as unknown as Prisma.InputJsonValue,
      recommendationsJson: record.recommendations as unknown as Prisma.InputJsonValue,
      soilAnomalyDetected: record.soilAnomalyDetected,
      soilAnomalyReason: record.soilAnomalyReason,
      mlModelsJson: record.mlModelsUsed as unknown as Prisma.InputJsonValue,
      assumptionsJson: record.assumptions as unknown as Prisma.InputJsonValue,
      limitationsJson: record.limitations as unknown as Prisma.InputJsonValue,
      generatedAt: new Date(record.generatedAt),
    },
    create: {
      id: record.id,
      farmId: record.farmId,
      userId: record.userId,
      version: record.version,
      dataCompletenessPct: record.dataCompletenessPct,
      completenessJson: record.completenessItems as unknown as Prisma.InputJsonValue,
      savingsJson: record.savings as unknown as Prisma.InputJsonValue,
      verifiedTrackingJson: record.verifiedTracking as unknown as Prisma.InputJsonValue,
      forecastJson: record.soilMoistureForecast7d as unknown as Prisma.InputJsonValue,
      plotBreakdownsJson: record.plotBreakdowns as unknown as Prisma.InputJsonValue,
      recommendationsJson: record.recommendations as unknown as Prisma.InputJsonValue,
      soilAnomalyDetected: record.soilAnomalyDetected,
      soilAnomalyReason: record.soilAnomalyReason,
      mlModelsJson: record.mlModelsUsed as unknown as Prisma.InputJsonValue,
      assumptionsJson: record.assumptions as unknown as Prisma.InputJsonValue,
      limitationsJson: record.limitations as unknown as Prisma.InputJsonValue,
      generatedAt: new Date(record.generatedAt),
    },
  });
  return farmBrainRowToRecord(row);
}

export async function pgGetLatestFarmBrainAnalysis(
  prisma: PrismaClient,
  farmId: string
): Promise<FarmBrainAnalysisRecord | null> {
  const row = await prisma.farmBrainAnalysis.findFirst({
    where: { farmId },
    orderBy: [{ version: "desc" }, { generatedAt: "desc" }],
  });
  return row ? farmBrainRowToRecord(row) : null;
}

export async function pgListFarmBrainHistory(
  prisma: PrismaClient,
  farmId: string,
  limit = 20
): Promise<FarmBrainAnalysisRecord[]> {
  const rows = await prisma.farmBrainAnalysis.findMany({
    where: { farmId },
    orderBy: [{ version: "desc" }, { generatedAt: "desc" }],
    take: limit,
  });
  return rows.map(farmBrainRowToRecord);
}

export async function pgSaveSimulationScenario(
  prisma: PrismaClient,
  scenario: SimulationScenarioRecord
): Promise<SimulationScenarioRecord> {
  const row = await prisma.simulationScenario.upsert({
    where: { id: scenario.id },
    update: {
      name: scenario.name,
      scenarioType: scenario.scenarioType,
      inputsJson: scenario.inputs as unknown as Prisma.InputJsonValue,
      resultJson: scenario.result
        ? (scenario.result as unknown as Prisma.InputJsonValue)
        : undefined,
      isArchived: scenario.isArchived,
      lastRunAt: scenario.lastRunAt ? new Date(scenario.lastRunAt) : null,
    },
    create: {
      id: scenario.id,
      farmId: scenario.farmId,
      userId: scenario.userId,
      name: scenario.name,
      scenarioType: scenario.scenarioType,
      inputsJson: scenario.inputs as unknown as Prisma.InputJsonValue,
      resultJson: scenario.result
        ? (scenario.result as unknown as Prisma.InputJsonValue)
        : undefined,
      isArchived: scenario.isArchived,
      createdAt: new Date(scenario.createdAt),
      lastRunAt: scenario.lastRunAt ? new Date(scenario.lastRunAt) : null,
    },
  });
  return scenarioRowToRecord(row);
}

export async function pgGetSimulationScenarioById(
  prisma: PrismaClient,
  id: string
): Promise<SimulationScenarioRecord | null> {
  const row = await prisma.simulationScenario.findUnique({ where: { id } });
  return row ? scenarioRowToRecord(row) : null;
}

export async function pgListSimulationScenarios(
  prisma: PrismaClient,
  userId: string,
  farmId?: string,
  includeArchived = false
): Promise<SimulationScenarioRecord[]> {
  const rows = await prisma.simulationScenario.findMany({
    where: {
      userId,
      ...(farmId ? { farmId } : {}),
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });
  return rows.map(scenarioRowToRecord);
}

export async function pgDeleteSimulationScenario(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<boolean> {
  const res = await prisma.simulationScenario.deleteMany({
    where: { id, userId },
  });
  return res.count > 0;
}

export async function pgUpsertMLModelMetadata(
  prisma: PrismaClient,
  meta: MLModelMetadataRecord
): Promise<MLModelMetadataRecord> {
  const row = await prisma.mLModelMetadata.upsert({
    where: { modelName: meta.modelName },
    update: {
      algorithm: meta.algorithm,
      version: meta.version,
      targetVariable: meta.targetVariable,
      mae: meta.mae,
      rmse: meta.rmse,
      r2: meta.r2,
      trainSamples: meta.trainSamples,
      testSamples: meta.testSamples,
      featureNames: meta.featureNames as unknown as Prisma.InputJsonValue,
      trainedAt: new Date(meta.trainedAt),
    },
    create: {
      id: meta.id,
      modelName: meta.modelName,
      algorithm: meta.algorithm,
      version: meta.version,
      targetVariable: meta.targetVariable,
      mae: meta.mae,
      rmse: meta.rmse,
      r2: meta.r2,
      trainSamples: meta.trainSamples,
      testSamples: meta.testSamples,
      featureNames: meta.featureNames as unknown as Prisma.InputJsonValue,
      trainedAt: new Date(meta.trainedAt),
    },
  });
  return mlMetaRowToRecord(row);
}

export async function pgListMLModelMetadata(
  prisma: PrismaClient
): Promise<MLModelMetadataRecord[]> {
  const rows = await prisma.mLModelMetadata.findMany({
    orderBy: { modelName: "asc" },
  });
  return rows.map(mlMetaRowToRecord);
}

export async function pgInsertMLPredictionLog(
  prisma: PrismaClient,
  log: MLPredictionLogRecord
): Promise<void> {
  await prisma.mLPredictionLog.create({
    data: {
      id: log.id,
      farmId: log.farmId,
      modelName: log.modelName,
      inputSummary: log.inputSummary as unknown as Prisma.InputJsonValue,
      outputSummary: log.outputSummary as unknown as Prisma.InputJsonValue,
      provenance: log.provenance,
      createdAt: new Date(log.createdAt),
    },
  });
}
