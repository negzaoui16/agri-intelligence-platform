import * as turf from "@turf/turf";
import type {
  AIChatMessageRecord,
  CompleteFarmAnalysisBundle,
  FarmCropRecord,
  FarmerProfileRecord,
  FarmerWaterSourceRecord,
  FarmPin,
  FarmRecord,
  FeasibilityReportPayload,
  GeoPolygon,
  IrrigationMethod,
  OnboardingProgressRecord,
  SoilTextureClass,
  UserAccountRecord,
} from "@/types/agri";
import { IRRIGATION_EFFICIENCY_DEFAULTS, SOIL_TEXTURE_DEFAULTS } from "./defaults";
import { readLocalDb, writeLocalDb } from "./local-store";
import { getPrismaClient } from "./prisma";
import {
  DatabaseWriteError,
  isUniqueViolation,
  pgAppendConversation,
  pgGetConversation,
  pgGetFarm,
  pgListFarms,
  pgListReports,
  pgSaveFarm,
  pgSaveProfile,
  pgSaveProgress,
  pgSaveReport,
  pgSaveUser,
  profileRowToRecord,
  progressRowToRecord,
  userRowToRecord,
} from "./pg-store";

/** Runs a Postgres write and rethrows failures with context instead of silently losing data. */
async function dbWrite<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_EMAIL") throw err;
    console.error(`[db] ${operation} failed`, err);
    throw new DatabaseWriteError(operation);
  }
}

/**
 * Farms reference their owner. Make sure the owner's account row exists in Postgres,
 * created from the real account record (never a placeholder email).
 */
async function ensureUserRow(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) return;
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (exists) return;
  const local = readLocalDb().users.find((u) => u.id === userId);
  if (!local) {
    throw new Error(`No account record for user ${userId}; cannot save farm data for an unknown owner`);
  }
  await pgSaveUser(prisma, local);
}

export function computePolygonMetrics(boundary?: GeoPolygon | null): {
  areaHectares: number;
  perimeterMeters: number;
  centroidLat?: number;
  centroidLon?: number;
} | null {
  if (!boundary || boundary.type !== "Polygon" || !boundary.coordinates[0]?.length) {
    return null;
  }
  try {
    const poly = turf.polygon(boundary.coordinates);
    const areaSqM = turf.area(poly);
    const line = turf.polygonToLine(poly);
    const lengthKm =
      line.type === "FeatureCollection"
        ? line.features.reduce((acc, f) => acc + turf.length(f, { units: "kilometers" }), 0)
        : turf.length(line, { units: "kilometers" });
    const centroid = turf.centroid(poly);
    return {
      areaHectares: Number((areaSqM / 10_000).toFixed(4)),
      perimeterMeters: Number((lengthKm * 1000).toFixed(2)),
      centroidLon: centroid.geometry.coordinates[0],
      centroidLat: centroid.geometry.coordinates[1],
    };
  } catch {
    return null;
  }
}

export async function listFarms(userId: string): Promise<FarmRecord[]> {
  const prisma = getPrismaClient();
  if (prisma) return pgListFarms(prisma, userId);
  const db = readLocalDb();
  return db.farms.filter((f) => f.userId === userId);
}

export async function getFarmById(
  farmId: string,
  ownerUserId?: string
): Promise<FarmRecord | null> {
  const prisma = getPrismaClient();
  const farm = prisma
    ? await pgGetFarm(prisma, farmId)
    : readLocalDb().farms.find((f) => f.id === farmId) ?? null;
  if (farm && ownerUserId && farm.userId !== ownerUserId) return null;
  return farm;
}

export interface UpsertFarmInput {
  id?: string;
  userId: string;
  name: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  governorate?: string | null;
  delegation?: string | null;
  locality?: string | null;
  centerLat: number;
  centerLon: number;
  elevationM?: number | null;
  areaHectares?: number;
  perimeterMeters?: number;
  boundary?: GeoPolygon | null;
  boundaryVerified?: boolean;
  pins?: Array<Omit<FarmPin, "farmId" | "createdAt"> & { createdAt?: string }>;
  crops?: FarmCropRecord[];
  allowCropOverlap?: boolean;
  farmerWaterSources?: FarmerWaterSourceRecord[];
  primaryCropCode?: string;
  plantingMonth?: number;
  soilTexture?: SoilTextureClass;
  irrigationMethod?: IrrigationMethod;
  solarConfig?: Partial<FarmRecord["solarConfig"]>;
  pumpConfig?: Partial<FarmRecord["pumpConfig"]>;
  updatedAt?: string;
}

export async function upsertFarm(input: UpsertFarmInput): Promise<FarmRecord> {
  const now = input.updatedAt ?? new Date().toISOString();
  // Merge from the same store reads come from (Postgres when connected), so a partial
  // update never resets fields the local file doesn't know about.
  const existing = input.id ? (await getFarmById(input.id)) ?? undefined : undefined;
  if (existing && existing.userId !== input.userId) {
    throw new Error("Forbidden: You do not own this agricultural property");
  }
  const farmId =
    existing?.id ?? input.id ?? `farm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const boundary = input.boundary !== undefined ? input.boundary : existing?.boundary ?? null;
  const polyMetrics = computePolygonMetrics(boundary);
  const centerLat = polyMetrics?.centroidLat ?? input.centerLat;
  const centerLon = polyMetrics?.centroidLon ?? input.centerLon;
  const areaHectares = polyMetrics?.areaHectares ?? input.areaHectares ?? existing?.areaHectares ?? 1.0;
  const perimeterMeters =
    polyMetrics?.perimeterMeters ?? input.perimeterMeters ?? existing?.perimeterMeters ?? 400.0;
  const boundaryVerified =
    input.boundaryVerified !== undefined
      ? input.boundaryVerified
      : boundary !== null;

  const soilClass: SoilTextureClass =
    input.soilTexture ?? existing?.soilProfile.textureClass ?? "LOAM";
  const irrMethod: IrrigationMethod =
    input.irrigationMethod ?? existing?.irrigationConfig.irrigationMethod ?? "DRIP";

  const pins: FarmPin[] = (input.pins ?? existing?.pins ?? []).map((p, idx) => ({
    id: p.id || `pin_${farmId}_${idx}_${Date.now()}`,
    farmId,
    label: p.label,
    role: p.role,
    latitude: p.latitude,
    longitude: p.longitude,
    elevationM: p.elevationM ?? null,
    notes: p.notes ?? null,
    createdAt: p.createdAt ?? now,
  }));

  if (pins.length === 0) {
    pins.push({
      id: `pin_${farmId}_center`,
      farmId,
      label: "Property Center",
      role: "FIELD_CENTER",
      latitude: centerLat,
      longitude: centerLon,
      elevationM: input.elevationM ?? existing?.elevationM ?? null,
      notes: "Primary reference coordinate",
      createdAt: now,
    });
  }

  const nextRecord: FarmRecord = {
    id: farmId,
    userId: input.userId,
    name: input.name,
    description: input.description ?? existing?.description ?? null,
    country: input.country ?? existing?.country ?? null,
    region: input.region ?? existing?.region ?? null,
    governorate: input.governorate ?? existing?.governorate ?? null,
    delegation: input.delegation ?? existing?.delegation ?? null,
    locality: input.locality ?? existing?.locality ?? null,
    centerLat,
    centerLon,
    elevationM: input.elevationM ?? existing?.elevationM ?? null,
    areaHectares,
    perimeterMeters,
    boundary,
    boundaryVerified,
    pins,
    crops: input.crops !== undefined ? input.crops : existing?.crops,
    allowCropOverlap:
      input.allowCropOverlap !== undefined
        ? input.allowCropOverlap
        : existing?.allowCropOverlap,
    farmerWaterSources:
      input.farmerWaterSources !== undefined
        ? input.farmerWaterSources
        : existing?.farmerWaterSources,
    soilProfile: {
      ...SOIL_TEXTURE_DEFAULTS[soilClass],
      source: existing?.soilProfile.source ?? "User Selected / Soil Texture Baseline",
      updatedAt: now,
    },
    solarConfig: {
      solarStatus: input.solarConfig?.solarStatus ?? existing?.solarConfig.solarStatus ?? "NOT_SURE",
      capacityKwp: input.solarConfig?.capacityKwp ?? existing?.solarConfig.capacityKwp ?? 8.0,
      panelCount: input.solarConfig?.panelCount ?? existing?.solarConfig.panelCount ?? null,
      panelWattageW: input.solarConfig?.panelWattageW ?? existing?.solarConfig.panelWattageW ?? null,
      tiltDeg:
        input.solarConfig?.tiltDeg ??
        existing?.solarConfig.tiltDeg ??
        Math.min(60, Math.max(10, Math.round(Math.abs(centerLat) * 0.85))),
      azimuthDeg: input.solarConfig?.azimuthDeg ?? existing?.solarConfig.azimuthDeg ?? 0,
      mountingType: input.solarConfig?.mountingType ?? existing?.solarConfig.mountingType ?? "free",
      systemLossPct: input.solarConfig?.systemLossPct ?? existing?.solarConfig.systemLossPct ?? 14,
      optimizeAngles:
        input.solarConfig?.optimizeAngles ?? existing?.solarConfig.optimizeAngles ?? false,
      hasBattery: input.solarConfig?.hasBattery ?? existing?.solarConfig.hasBattery ?? false,
      batteryCapacityKwh:
        input.solarConfig?.batteryCapacityKwh ?? existing?.solarConfig.batteryCapacityKwh ?? null,
      hasGridConnection:
        input.solarConfig?.hasGridConnection ?? existing?.solarConfig.hasGridConnection ?? false,
      wantsEstimate: input.solarConfig?.wantsEstimate ?? existing?.solarConfig.wantsEstimate ?? "YES",
      budgetAmount: input.solarConfig?.budgetAmount ?? existing?.solarConfig.budgetAmount ?? null,
      isFarmerProvided:
        input.solarConfig?.isFarmerProvided ?? existing?.solarConfig.isFarmerProvided ?? false,
      updatedAt: now,
    },
    pumpConfig: {
      hasPump: input.pumpConfig?.hasPump ?? existing?.pumpConfig.hasPump ?? true,
      pumpType: input.pumpConfig?.pumpType ?? existing?.pumpConfig.pumpType ?? null,
      powerKw: input.pumpConfig?.powerKw ?? existing?.pumpConfig.powerKw ?? null,
      flowRateM3Hr: input.pumpConfig?.flowRateM3Hr ?? existing?.pumpConfig.flowRateM3Hr ?? 20,
      staticHeadM: input.pumpConfig?.staticHeadM ?? existing?.pumpConfig.staticHeadM ?? 15,
      pipeLengthM: input.pumpConfig?.pipeLengthM ?? existing?.pumpConfig.pipeLengthM ?? 180,
      pipeDiameterMm: input.pumpConfig?.pipeDiameterMm ?? existing?.pumpConfig.pipeDiameterMm ?? 75,
      pipeMaterialC: input.pumpConfig?.pipeMaterialC ?? existing?.pumpConfig.pipeMaterialC ?? 140,
      frictionLossM: input.pumpConfig?.frictionLossM ?? existing?.pumpConfig.frictionLossM ?? 3.5,
      operatingPressureHeadM:
        input.pumpConfig?.operatingPressureHeadM ??
        existing?.pumpConfig.operatingPressureHeadM ??
        (IRRIGATION_EFFICIENCY_DEFAULTS[irrMethod]?.typicalPressureHeadM ?? 15),
      totalDynamicHeadM:
        input.pumpConfig?.totalDynamicHeadM ?? existing?.pumpConfig.totalDynamicHeadM ?? 33.5,
      pumpEfficiencyPct:
        input.pumpConfig?.pumpEfficiencyPct ?? existing?.pumpConfig.pumpEfficiencyPct ?? 65,
      motorEfficiencyPct:
        input.pumpConfig?.motorEfficiencyPct ?? existing?.pumpConfig.motorEfficiencyPct ?? 88,
      operatingHoursDay:
        input.pumpConfig?.operatingHoursDay ?? existing?.pumpConfig.operatingHoursDay ?? 6,
      isFarmerProvided:
        input.pumpConfig?.isFarmerProvided ?? existing?.pumpConfig.isFarmerProvided ?? false,
      updatedAt: now,
    },
    irrigationConfig: {
      cropCode:
        input.primaryCropCode ??
        input.crops?.[0]?.cropCode ??
        existing?.irrigationConfig.cropCode ??
        "tomato",
      irrigatedAreaHa: areaHectares,
      irrigationMethod: irrMethod,
      applicationEfficiencyPct:
        IRRIGATION_EFFICIENCY_DEFAULTS[irrMethod]?.efficiencyPct ?? 90,
      plantingMonth: input.plantingMonth ?? existing?.irrigationConfig.plantingMonth ?? 3,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const prisma = getPrismaClient();
  if (prisma) {
    return dbWrite(`save farm ${farmId}`, async () => {
      await ensureUserRow(input.userId);
      return pgSaveFarm(prisma, nextRecord);
    });
  }

  const db = readLocalDb();
  if (db.farms.some((f) => f.id === farmId)) {
    db.farms = db.farms.map((f) => (f.id === farmId ? nextRecord : f));
  } else {
    db.farms.unshift(nextRecord);
  }
  writeLocalDb(db);
  return nextRecord;
}

export async function deleteFarm(farmId: string, ownerUserId?: string): Promise<boolean> {
  const prisma = getPrismaClient();
  if (prisma) {
    const target = await prisma.farm.findUnique({ where: { id: farmId }, select: { userId: true } });
    if (!target) return false;
    if (ownerUserId && target.userId !== ownerUserId) {
      throw new Error("Forbidden: You do not own this agricultural property");
    }
    // Cascades to boundary, pins, soil, solar, pump, crops, water sources and reports
    await dbWrite(`delete farm ${farmId}`, () => prisma.farm.delete({ where: { id: farmId } }));
    const db = readLocalDb();
    if (db.analyses[farmId]) {
      delete db.analyses[farmId];
      writeLocalDb(db);
    }
    return true;
  }

  const db = readLocalDb();
  const target = db.farms.find((f) => f.id === farmId);
  if (!target) return false;
  if (ownerUserId && target.userId !== ownerUserId) {
    throw new Error("Forbidden: You do not own this agricultural property");
  }
  db.farms = db.farms.filter((f) => f.id !== farmId);
  delete db.analyses[farmId];
  db.reports = db.reports.filter((r) => r.farmId !== farmId);
  writeLocalDb(db);
  return true;
}

export function saveAnalysisBundle(bundle: CompleteFarmAnalysisBundle): void {
  const db = readLocalDb();
  db.analyses[bundle.farmId] = bundle;
  writeLocalDb(db);
}

export function getAnalysisBundle(farmId: string): CompleteFarmAnalysisBundle | null {
  const db = readLocalDb();
  return db.analyses[farmId] ?? null;
}

export async function saveReport(report: FeasibilityReportPayload): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`save report ${report.id}`, () => pgSaveReport(prisma, report));
    return;
  }
  const db = readLocalDb();
  db.reports = [report, ...db.reports.filter((r) => r.id !== report.id)].slice(0, 50);
  writeLocalDb(db);
}

export async function listReports(
  farmId?: string,
  ownerUserId?: string
): Promise<FeasibilityReportPayload[]> {
  const prisma = getPrismaClient();
  if (prisma) return pgListReports(prisma, { farmId, ownerUserId });
  const db = readLocalDb();
  let list = db.reports;
  if (ownerUserId) {
    const ownedIds = new Set(
      db.farms.filter((f) => f.userId === ownerUserId).map((f) => f.id)
    );
    list = list.filter((r) => ownedIds.has(r.farmId));
  }
  if (!farmId) return list;
  return list.filter((r) => r.farmId === farmId);
}

// --- User Accounts, Farmer Profiles & Onboarding Progress ---

export async function findUserByEmail(email: string): Promise<UserAccountRecord | null> {
  const normalized = email.trim().toLowerCase();
  const prisma = getPrismaClient();
  if (prisma) {
    const row = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
    });
    return row ? userRowToRecord(row) : null;
  }
  const db = readLocalDb();
  return db.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function findUserById(userId: string): Promise<UserAccountRecord | null> {
  const prisma = getPrismaClient();
  if (prisma) {
    const row = await prisma.user.findUnique({ where: { id: userId } });
    return row ? userRowToRecord(row) : null;
  }
  const db = readLocalDb();
  return db.users.find((u) => u.id === userId) ?? null;
}

export async function findUserByResetTokenHash(
  tokenHash: string
): Promise<UserAccountRecord | null> {
  const prisma = getPrismaClient();
  if (prisma) {
    const row = await prisma.user.findFirst({
      where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
    });
    return row ? userRowToRecord(row) : null;
  }
  const db = readLocalDb();
  return (
    db.users.find(
      (u) =>
        u.resetTokenHash === tokenHash &&
        u.resetTokenExpiresAt &&
        new Date(u.resetTokenExpiresAt).getTime() > Date.now()
    ) ?? null
  );
}

export async function createUserAccount(input: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "FARMER" | "AGRONOMIST" | "ADMIN";
  authProvider?: "EMAIL" | "GOOGLE";
  googleId?: string | null;
  emailVerified?: boolean;
}): Promise<UserAccountRecord> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (await findUserByEmail(normalizedEmail)) {
    throw new Error("DUPLICATE_EMAIL");
  }
  const now = new Date().toISOString();
  const record: UserAccountRecord = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: normalizedEmail,
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    role: input.role ?? "FARMER",
    authProvider: input.authProvider ?? "EMAIL",
    googleId: input.googleId ?? null,
    emailVerified: input.emailVerified ?? false,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`create user ${record.email}`, async () => {
      try {
        await pgSaveUser(prisma, record);
      } catch (err) {
        // Two registrations racing for the same email
        if (isUniqueViolation(err, "email")) throw new Error("DUPLICATE_EMAIL");
        throw err;
      }
    });
    return record;
  }

  const db = readLocalDb();
  db.users.push(record);
  writeLocalDb(db);
  return record;
}

export async function updateUserAccount(
  userId: string,
  updates: Partial<UserAccountRecord>
): Promise<UserAccountRecord | null> {
  const current = await findUserById(userId);
  if (!current) return null;
  const updated: UserAccountRecord = {
    ...current,
    ...updates,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };

  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`update user ${userId}`, () => pgSaveUser(prisma, updated));
    return updated;
  }

  const db = readLocalDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  db.users[idx] = updated;
  writeLocalDb(db);
  return updated;
}

export async function getFarmerProfile(userId: string): Promise<FarmerProfileRecord | null> {
  const prisma = getPrismaClient();
  if (prisma) {
    const row = await prisma.farmerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    return row ? profileRowToRecord(row) : null;
  }
  const db = readLocalDb();
  return db.farmerProfiles.find((p) => p.userId === userId) ?? null;
}

export async function upsertFarmerProfile(
  userId: string,
  input: Partial<Omit<FarmerProfileRecord, "id" | "userId" | "createdAt" | "updatedAt">> & {
    email: string;
    firstName: string;
    lastName: string;
  }
): Promise<FarmerProfileRecord> {
  const now = new Date().toISOString();
  const existing = await getFarmerProfile(userId);

  const record: FarmerProfileRecord = {
    id: existing?.id ?? `prof_${userId}`,
    userId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone ?? existing?.phone ?? null,
    email: existing?.email ?? input.email.trim().toLowerCase(),
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl ?? null,
    country: input.country ?? existing?.country ?? "Tunisia",
    governorate: input.governorate ?? existing?.governorate ?? null,
    delegation: input.delegation ?? existing?.delegation ?? null,
    locality: input.locality ?? existing?.locality ?? null,
    preferredLanguage: input.preferredLanguage ?? existing?.preferredLanguage ?? "en",
    preferredUnits: input.preferredUnits ?? existing?.preferredUnits ?? "metric",
    experienceLevel: input.experienceLevel ?? existing?.experienceLevel ?? "YEARS_2_5",
    activityType: input.activityType ?? existing?.activityType ?? "SMALL_FAMILY_FARM",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`save farmer profile ${userId}`, async () => {
      await ensureUserRow(userId);
      await pgSaveProfile(prisma, record);
    });
    return record;
  }

  const db = readLocalDb();
  const existingIdx = db.farmerProfiles.findIndex((p) => p.userId === userId);
  if (existingIdx >= 0) {
    db.farmerProfiles[existingIdx] = record;
  } else {
    db.farmerProfiles.push(record);
  }
  writeLocalDb(db);
  return record;
}

function defaultOnboardingProgress(userId: string): OnboardingProgressRecord {
  return {
    id: `onb_${userId}`,
    userId,
    activeFarmId: null,
    currentStep: 1,
    completedSteps: [],
    isCompleted: false,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgressRecord> {
  const prisma = getPrismaClient();
  if (prisma) {
    // Not persisted on read: the row is written by the first upsertOnboardingProgress
    const row = await prisma.onboardingProgress.findUnique({ where: { userId } });
    return row ? progressRowToRecord(row) : defaultOnboardingProgress(userId);
  }
  const db = readLocalDb();
  const existing = db.onboardingProgress.find((o) => o.userId === userId);
  if (existing) return existing;
  const created = defaultOnboardingProgress(userId);
  db.onboardingProgress.push(created);
  writeLocalDb(db);
  return created;
}

export async function upsertOnboardingProgress(
  userId: string,
  updates: Partial<Omit<OnboardingProgressRecord, "id" | "userId">>
): Promise<OnboardingProgressRecord> {
  const now = new Date().toISOString();
  const existing = await getOnboardingProgress(userId);
  const mergedSteps = Array.from(
    new Set([
      ...existing.completedSteps,
      ...(updates.completedSteps ?? []),
    ])
  ).sort((a, b) => a - b);

  const next: OnboardingProgressRecord = {
    ...existing,
    ...updates,
    completedSteps: updates.completedSteps ? mergedSteps : existing.completedSteps,
    updatedAt: now,
  };

  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`save onboarding progress ${userId}`, async () => {
      await ensureUserRow(userId);
      await pgSaveProgress(prisma, next);
    });
    return next;
  }

  const db = readLocalDb();
  const idx = db.onboardingProgress.findIndex((o) => o.userId === userId);
  if (idx >= 0) {
    db.onboardingProgress[idx] = next;
  } else {
    db.onboardingProgress.push(next);
  }
  writeLocalDb(db);
  return next;
}

export async function appendConversationMessages(
  userId: string,
  farmId: string | undefined,
  messages: AIChatMessageRecord[]
): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`save AI conversation for ${userId}`, async () => {
      await ensureUserRow(userId);
      await pgAppendConversation(prisma, userId, farmId, messages);
    });
    return;
  }

  const db = readLocalDb();
  // Conversations are private per user (the general thread used to be shared by everyone)
  const convId = farmId ? `conv_${userId}_${farmId}` : `conv_${userId}_general`;
  const existing = db.conversations.find((c) => c.id === convId);
  const now = new Date().toISOString();
  if (existing) {
    existing.messages.push(...messages);
    existing.messages = existing.messages.slice(-40);
    existing.updatedAt = now;
  } else {
    db.conversations.unshift({
      id: convId,
      farmId: farmId ?? null,
      userId,
      title: farmId ? `Agronomy Consultation (${farmId})` : "General Agronomy Consultation",
      messages: messages.slice(-40),
      updatedAt: now,
    });
  }
  writeLocalDb(db);
}

export async function getConversationMessages(
  userId: string,
  farmId?: string
): Promise<AIChatMessageRecord[]> {
  const prisma = getPrismaClient();
  if (prisma) return pgGetConversation(prisma, userId, farmId);
  const db = readLocalDb();
  const convId = farmId ? `conv_${userId}_${farmId}` : `conv_${userId}_general`;
  return db.conversations.find((c) => c.id === convId)?.messages ?? [];
}

export interface SyncProcessOutcome {
  operationId: string;
  entityType: string;
  entityId: string;
  status: "APPLIED" | "CONFLICT" | "REJECTED";
  reason?: string;
  serverRecord?: unknown;
  serverTimestamp: string;
}

type SyncLogRecord = {
  operationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  clientTimestamp: string;
  serverTimestamp: string;
  status: "APPLIED" | "CONFLICT" | "REJECTED";
};

async function findSyncLogEntry(operationId: string): Promise<SyncLogRecord | null> {
  const prisma = getPrismaClient();
  if (prisma) {
    const row = await prisma.syncOperation.findUnique({ where: { operationId } });
    return row
      ? {
          operationId: row.operationId,
          userId: row.userId,
          entityType: row.entityType,
          entityId: row.entityId,
          action: row.action,
          clientTimestamp: row.clientTimestamp.toISOString(),
          serverTimestamp: row.serverTimestamp.toISOString(),
          status: row.status,
        }
      : null;
  }
  return readLocalDb().syncLog.find((entry) => entry.operationId === operationId) ?? null;
}

async function recordSyncLogEntry(entry: SyncLogRecord, payload: unknown): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await dbWrite(`record sync operation ${entry.operationId}`, async () => {
      await ensureUserRow(entry.userId);
      await prisma.syncOperation.create({
        data: {
          id: `sync_${entry.operationId}`,
          operationId: entry.operationId,
          userId: entry.userId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          payloadJson: (payload ?? {}) as object,
          clientTimestamp: new Date(entry.clientTimestamp),
          serverTimestamp: new Date(entry.serverTimestamp),
          status: entry.status,
        },
      });
    });
    return;
  }
  const db = readLocalDb();
  db.syncLog.push(entry);
  writeLocalDb(db);
}

export async function processSyncOperations(
  userId: string,
  operations: Array<{
    operationId: string;
    entityType: "FARM" | "PIN" | "BOUNDARY" | "CONFIG" | "REPORT" | "ONBOARDING";
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    payload?: unknown;
    clientTimestamp: string;
  }>
): Promise<SyncProcessOutcome[]> {
  const results: SyncProcessOutcome[] = [];
  const serverTimestamp = new Date().toISOString();

  for (const op of operations) {
    const duplicate = await findSyncLogEntry(op.operationId);
    if (duplicate) {
      results.push({
        operationId: op.operationId,
        entityType: op.entityType,
        entityId: op.entityId,
        status: duplicate.status,
        reason: "Idempotent replay: operation already processed",
        serverTimestamp: duplicate.serverTimestamp,
      });
      continue;
    }

    const logEntry = (status: SyncLogRecord["status"]): SyncLogRecord => ({
      operationId: op.operationId,
      userId,
      entityType: op.entityType,
      entityId: op.entityId,
      action: op.action,
      clientTimestamp: op.clientTimestamp,
      serverTimestamp,
      status,
    });

    if (op.entityType === "FARM") {
      const existing = await getFarmById(op.entityId);
      if (existing && existing.userId !== userId) {
        await recordSyncLogEntry(logEntry("REJECTED"), op.payload);
        results.push({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          status: "REJECTED",
          reason: "Forbidden: You do not own this agricultural property",
          serverTimestamp,
        });
        continue;
      }
      if (existing && new Date(existing.updatedAt).getTime() > new Date(op.clientTimestamp).getTime()) {
        await recordSyncLogEntry(logEntry("CONFLICT"), op.payload);
        results.push({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          status: "CONFLICT",
          reason: `Server record (${existing.updatedAt}) is newer than offline edit (${op.clientTimestamp})`,
          serverRecord: existing,
          serverTimestamp,
        });
        continue;
      }

      if (op.action === "DELETE") {
        await deleteFarm(op.entityId, userId);
      } else {
        const payload = op.payload as UpsertFarmInput;
        await upsertFarm({
          ...payload,
          id: op.entityId,
          userId,
          updatedAt: op.clientTimestamp,
        });
      }
    } else if (op.entityType === "ONBOARDING" && op.action !== "DELETE") {
      const payload = (op.payload ?? {}) as {
        profile?: Partial<FarmerProfileRecord> & { firstName?: string; lastName?: string; email?: string };
        progress?: Partial<OnboardingProgressRecord>;
      };
      const user = await findUserById(userId);
      if (payload.profile && (payload.profile.firstName || user)) {
        await upsertFarmerProfile(userId, {
          ...payload.profile,
          email: payload.profile.email || user?.email || "",
          firstName: payload.profile.firstName || user?.name.split(" ")[0] || "Farmer",
          lastName: payload.profile.lastName || user?.name.split(" ").slice(1).join(" ") || "Account",
        });
      }
      if (payload.progress) {
        await upsertOnboardingProgress(userId, payload.progress);
      }
    } else if (op.entityType === "REPORT" && op.action !== "DELETE") {
      const report = op.payload as FeasibilityReportPayload;
      const ownedFarm = report?.farmId ? await getFarmById(report.farmId, userId) : null;
      if (!ownedFarm) {
        await recordSyncLogEntry(logEntry("REJECTED"), op.payload);
        results.push({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          status: "REJECTED",
          reason: "Report must belong to one of your farms",
          serverTimestamp,
        });
        continue;
      }
      await saveReport(report);
    }

    await recordSyncLogEntry(logEntry("APPLIED"), op.payload);
    results.push({
      operationId: op.operationId,
      entityType: op.entityType,
      entityId: op.entityId,
      status: "APPLIED",
      serverTimestamp,
    });
  }

  return results;
}
