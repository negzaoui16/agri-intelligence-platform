import * as turf from "@turf/turf";
import type {
  AIChatMessageRecord,
  CompleteFarmAnalysisBundle,
  FarmPin,
  FarmRecord,
  FeasibilityReportPayload,
  GeoPolygon,
  IrrigationMethod,
  SoilTextureClass,
} from "@/types/agri";
import { IRRIGATION_EFFICIENCY_DEFAULTS, SOIL_TEXTURE_DEFAULTS } from "./defaults";
import { readLocalDb, writeLocalDb } from "./local-store";
import { getPrismaClient } from "./prisma";

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
  if (prisma) {
    try {
      const rows = await prisma.farm.findMany({
        where: { userId },
        include: {
          boundary: true,
          locations: true,
          soilProfile: true,
          solarConfig: true,
          pumpConfig: true,
          irrigationAnalyses: { orderBy: { retrievedAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        country: row.country,
        region: row.region,
        centerLat: row.centerLat,
        centerLon: row.centerLon,
        elevationM: row.elevationM,
        areaHectares: row.areaHectares,
        perimeterMeters: row.perimeterMeters,
        boundary: (row.boundary?.geojson as unknown as GeoPolygon) ?? null,
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
        soilProfile: row.soilProfile
          ? {
              textureClass: row.soilProfile.textureClass,
              fieldCapacityMmM: row.soilProfile.fieldCapacityMmM,
              wiltingPointMmM: row.soilProfile.wiltingPointMmM,
              tawMmM: row.soilProfile.tawMmM,
              infiltrationRateMmHr: row.soilProfile.infiltrationRateMmHr,
              organicMatterPct: row.soilProfile.organicMatterPct,
              ph: row.soilProfile.ph,
              source: row.soilProfile.source,
              updatedAt: row.soilProfile.updatedAt.toISOString(),
            }
          : {
              ...SOIL_TEXTURE_DEFAULTS.LOAM,
              source: "Default Loam Profile",
              updatedAt: row.updatedAt.toISOString(),
            },
        solarConfig: row.solarConfig
          ? {
              capacityKwp: row.solarConfig.capacityKwp,
              tiltDeg: row.solarConfig.tiltDeg,
              azimuthDeg: row.solarConfig.azimuthDeg,
              mountingType:
                row.solarConfig.mountingType === "building" ? "building" : "free",
              systemLossPct: row.solarConfig.systemLossPct,
              optimizeAngles: row.solarConfig.optimizeAngles,
              updatedAt: row.solarConfig.updatedAt.toISOString(),
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
        pumpConfig: row.pumpConfig
          ? {
              flowRateM3Hr: row.pumpConfig.flowRateM3Hr,
              staticHeadM: row.pumpConfig.staticHeadM,
              pipeLengthM: row.pumpConfig.pipeLengthM,
              pipeDiameterMm: row.pumpConfig.pipeDiameterMm,
              pipeMaterialC: 140,
              frictionLossM: row.pumpConfig.frictionLossM,
              operatingPressureHeadM: row.pumpConfig.operatingPressureHeadM,
              totalDynamicHeadM: row.pumpConfig.totalDynamicHeadM,
              pumpEfficiencyPct: row.pumpConfig.pumpEfficiencyPct,
              motorEfficiencyPct: row.pumpConfig.motorEfficiencyPct,
              operatingHoursDay: row.pumpConfig.operatingHoursDay,
              updatedAt: row.pumpConfig.updatedAt.toISOString(),
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
        irrigationConfig: {
          cropCode: row.primaryCropCode,
          irrigatedAreaHa: row.areaHectares,
          irrigationMethod: row.irrigationAnalyses[0]?.irrigationMethod ?? "DRIP",
          applicationEfficiencyPct:
            row.irrigationAnalyses[0]?.applicationEfficiencyPct ?? 90,
          plantingMonth: row.plantingMonth,
        },
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    } catch {
      // Fall back to local persistent JSON store
    }
  }

  const db = readLocalDb();
  return db.farms.filter((f) => f.userId === userId || f.userId === "user_demo_agronomist");
}

export async function getFarmById(farmId: string): Promise<FarmRecord | null> {
  const db = readLocalDb();
  const localMatch = db.farms.find((f) => f.id === farmId) ?? null;
  const prisma = getPrismaClient();
  if (!prisma) return localMatch;
  try {
    const row = await prisma.farm.findUnique({ where: { id: farmId } });
    if (!row) return localMatch;
    const all = await listFarms(row.userId);
    return all.find((f) => f.id === farmId) ?? localMatch;
  } catch {
    return localMatch;
  }
}

export interface UpsertFarmInput {
  id?: string;
  userId: string;
  name: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  centerLat: number;
  centerLon: number;
  elevationM?: number | null;
  areaHectares?: number;
  perimeterMeters?: number;
  boundary?: GeoPolygon | null;
  pins?: Array<Omit<FarmPin, "farmId" | "createdAt"> & { createdAt?: string }>;
  primaryCropCode?: string;
  plantingMonth?: number;
  soilTexture?: SoilTextureClass;
  irrigationMethod?: IrrigationMethod;
  solarConfig?: Partial<FarmRecord["solarConfig"]>;
  pumpConfig?: Partial<FarmRecord["pumpConfig"]>;
  updatedAt?: string;
}

export async function upsertFarm(input: UpsertFarmInput): Promise<FarmRecord> {
  const db = readLocalDb();
  const now = input.updatedAt ?? new Date().toISOString();
  const existing = input.id ? db.farms.find((f) => f.id === input.id) : undefined;
  const farmId = existing?.id ?? input.id ?? `farm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const boundary = input.boundary !== undefined ? input.boundary : existing?.boundary ?? null;
  const polyMetrics = computePolygonMetrics(boundary);
  const centerLat = polyMetrics?.centroidLat ?? input.centerLat;
  const centerLon = polyMetrics?.centroidLon ?? input.centerLon;
  const areaHectares = polyMetrics?.areaHectares ?? input.areaHectares ?? existing?.areaHectares ?? 1.0;
  const perimeterMeters =
    polyMetrics?.perimeterMeters ?? input.perimeterMeters ?? existing?.perimeterMeters ?? 400.0;

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
    centerLat,
    centerLon,
    elevationM: input.elevationM ?? existing?.elevationM ?? null,
    areaHectares,
    perimeterMeters,
    boundary,
    pins,
    soilProfile: {
      ...SOIL_TEXTURE_DEFAULTS[soilClass],
      source: existing?.soilProfile.source ?? "User Selected / Soil Texture Baseline",
      updatedAt: now,
    },
    solarConfig: {
      capacityKwp: input.solarConfig?.capacityKwp ?? existing?.solarConfig.capacityKwp ?? 8.0,
      tiltDeg:
        input.solarConfig?.tiltDeg ??
        existing?.solarConfig.tiltDeg ??
        Math.min(60, Math.max(10, Math.round(Math.abs(centerLat) * 0.85))),
      azimuthDeg: input.solarConfig?.azimuthDeg ?? existing?.solarConfig.azimuthDeg ?? 0,
      mountingType: input.solarConfig?.mountingType ?? existing?.solarConfig.mountingType ?? "free",
      systemLossPct: input.solarConfig?.systemLossPct ?? existing?.solarConfig.systemLossPct ?? 14,
      optimizeAngles:
        input.solarConfig?.optimizeAngles ?? existing?.solarConfig.optimizeAngles ?? false,
      updatedAt: now,
    },
    pumpConfig: {
      flowRateM3Hr: input.pumpConfig?.flowRateM3Hr ?? existing?.pumpConfig.flowRateM3Hr ?? 20,
      staticHeadM: input.pumpConfig?.staticHeadM ?? existing?.pumpConfig.staticHeadM ?? 15,
      pipeLengthM: input.pumpConfig?.pipeLengthM ?? existing?.pumpConfig.pipeLengthM ?? 180,
      pipeDiameterMm: input.pumpConfig?.pipeDiameterMm ?? existing?.pumpConfig.pipeDiameterMm ?? 75,
      pipeMaterialC: input.pumpConfig?.pipeMaterialC ?? existing?.pumpConfig.pipeMaterialC ?? 140,
      frictionLossM: input.pumpConfig?.frictionLossM ?? existing?.pumpConfig.frictionLossM ?? 3.5,
      operatingPressureHeadM:
        input.pumpConfig?.operatingPressureHeadM ??
        existing?.pumpConfig.operatingPressureHeadM ??
        IRRIGATION_EFFICIENCY_DEFAULTS[irrMethod].typicalPressureHeadM,
      totalDynamicHeadM:
        input.pumpConfig?.totalDynamicHeadM ?? existing?.pumpConfig.totalDynamicHeadM ?? 33.5,
      pumpEfficiencyPct:
        input.pumpConfig?.pumpEfficiencyPct ?? existing?.pumpConfig.pumpEfficiencyPct ?? 65,
      motorEfficiencyPct:
        input.pumpConfig?.motorEfficiencyPct ?? existing?.pumpConfig.motorEfficiencyPct ?? 88,
      operatingHoursDay:
        input.pumpConfig?.operatingHoursDay ?? existing?.pumpConfig.operatingHoursDay ?? 6,
      updatedAt: now,
    },
    irrigationConfig: {
      cropCode: input.primaryCropCode ?? existing?.irrigationConfig.cropCode ?? "tomato",
      irrigatedAreaHa: areaHectares,
      irrigationMethod: irrMethod,
      applicationEfficiencyPct: IRRIGATION_EFFICIENCY_DEFAULTS[irrMethod].efficiencyPct,
      plantingMonth: input.plantingMonth ?? existing?.irrigationConfig.plantingMonth ?? 3,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    db.farms = db.farms.map((f) => (f.id === farmId ? nextRecord : f));
  } else {
    db.farms.unshift(nextRecord);
  }
  writeLocalDb(db);

  // Sync to PostGIS if DATABASE_URL is connected
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      await prisma.user.upsert({
        where: { id: input.userId },
        update: {},
        create: {
          id: input.userId,
          email: "agronomist@terrapulse.agri",
          name: "Field Agronomist",
          passwordHash: "demo",
        },
      });
      await prisma.farm.upsert({
        where: { id: farmId },
        update: {
          name: nextRecord.name,
          description: nextRecord.description,
          country: nextRecord.country,
          region: nextRecord.region,
          centerLat: nextRecord.centerLat,
          centerLon: nextRecord.centerLon,
          elevationM: nextRecord.elevationM,
          areaHectares: nextRecord.areaHectares,
          perimeterMeters: nextRecord.perimeterMeters,
          primaryCropCode: nextRecord.irrigationConfig.cropCode,
          plantingMonth: nextRecord.irrigationConfig.plantingMonth,
        },
        create: {
          id: farmId,
          userId: input.userId,
          name: nextRecord.name,
          description: nextRecord.description,
          country: nextRecord.country,
          region: nextRecord.region,
          centerLat: nextRecord.centerLat,
          centerLon: nextRecord.centerLon,
          elevationM: nextRecord.elevationM,
          areaHectares: nextRecord.areaHectares,
          perimeterMeters: nextRecord.perimeterMeters,
          primaryCropCode: nextRecord.irrigationConfig.cropCode,
          plantingMonth: nextRecord.irrigationConfig.plantingMonth,
        },
      });
      if (boundary) {
        const geojsonStr = JSON.stringify(boundary);
        await prisma.$executeRaw`
          INSERT INTO "FarmBoundary" ("id", "farmId", "geojson", "areaHectares", "perimeterMeters", "geom", "updatedAt")
          VALUES (${`bnd_${farmId}`}, ${farmId}, ${geojsonStr}::jsonb, ${areaHectares}, ${perimeterMeters}, ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326), NOW())
          ON CONFLICT ("farmId") DO UPDATE SET
            "geojson" = EXCLUDED."geojson",
            "areaHectares" = EXCLUDED."areaHectares",
            "perimeterMeters" = EXCLUDED."perimeterMeters",
            "geom" = EXCLUDED."geom",
            "updatedAt" = NOW()
        `;
      }
    } catch {
      // Local store already persisted safely
    }
  }

  return nextRecord;
}

export async function deleteFarm(farmId: string): Promise<boolean> {
  const db = readLocalDb();
  const initialLen = db.farms.length;
  db.farms = db.farms.filter((f) => f.id !== farmId);
  delete db.analyses[farmId];
  db.reports = db.reports.filter((r) => r.farmId !== farmId);
  writeLocalDb(db);

  const prisma = getPrismaClient();
  if (prisma) {
    try {
      await prisma.farm.delete({ where: { id: farmId } });
    } catch {
      // Ignore if not in Postgres
    }
  }

  return db.farms.length < initialLen;
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

export function saveReport(report: FeasibilityReportPayload): void {
  const db = readLocalDb();
  db.reports = [report, ...db.reports.filter((r) => r.id !== report.id)].slice(0, 50);
  writeLocalDb(db);
}

export function listReports(farmId?: string): FeasibilityReportPayload[] {
  const db = readLocalDb();
  if (!farmId) return db.reports;
  return db.reports.filter((r) => r.farmId === farmId);
}

export function appendConversationMessages(
  userId: string,
  farmId: string | undefined,
  messages: AIChatMessageRecord[]
): void {
  const db = readLocalDb();
  const convId = farmId ? `conv_${farmId}` : "conv_general";
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

export function getConversationMessages(farmId?: string): AIChatMessageRecord[] {
  const db = readLocalDb();
  const convId = farmId ? `conv_${farmId}` : "conv_general";
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

export async function processSyncOperations(
  userId: string,
  operations: Array<{
    operationId: string;
    entityType: "FARM" | "PIN" | "BOUNDARY" | "CONFIG" | "REPORT";
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    payload?: unknown;
    clientTimestamp: string;
  }>
): Promise<SyncProcessOutcome[]> {
  const db = readLocalDb();
  const results: SyncProcessOutcome[] = [];
  const serverTimestamp = new Date().toISOString();

  for (const op of operations) {
    const duplicate = db.syncLog.find((entry) => entry.operationId === op.operationId);
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

    if (op.entityType === "FARM") {
      const existing = db.farms.find((f) => f.id === op.entityId);
      if (existing && new Date(existing.updatedAt).getTime() > new Date(op.clientTimestamp).getTime()) {
        db.syncLog.push({
          operationId: op.operationId,
          userId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          clientTimestamp: op.clientTimestamp,
          serverTimestamp,
          status: "CONFLICT",
        });
        writeLocalDb(db);
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
        await deleteFarm(op.entityId);
      } else {
        const payload = op.payload as UpsertFarmInput;
        await upsertFarm({
          ...payload,
          id: op.entityId,
          userId,
          updatedAt: op.clientTimestamp,
        });
      }
    } else if (op.entityType === "REPORT" && op.action !== "DELETE") {
      saveReport(op.payload as FeasibilityReportPayload);
    }

    const latestDb = readLocalDb();
    latestDb.syncLog.push({
      operationId: op.operationId,
      userId,
      entityType: op.entityType,
      entityId: op.entityId,
      action: op.action,
      clientTimestamp: op.clientTimestamp,
      serverTimestamp,
      status: "APPLIED",
    });
    writeLocalDb(latestDb);

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
