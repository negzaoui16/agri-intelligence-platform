import fs from "node:fs";
import path from "node:path";
import type {
  AIChatMessageRecord,
  CompleteFarmAnalysisBundle,
  FarmRecord,
  FeasibilityReportPayload,
} from "@/types/agri";
import { IRRIGATION_EFFICIENCY_DEFAULTS, SOIL_TEXTURE_DEFAULTS } from "./defaults";

export interface SyncLogEntry {
  operationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  clientTimestamp: string;
  serverTimestamp: string;
  status: "APPLIED" | "CONFLICT" | "REJECTED";
}

export interface LocalDbSnapshot {
  farms: FarmRecord[];
  analyses: Record<string, CompleteFarmAnalysisBundle>;
  reports: FeasibilityReportPayload[];
  conversations: Array<{
    id: string;
    farmId?: string | null;
    userId: string;
    title: string;
    messages: AIChatMessageRecord[];
    updatedAt: string;
  }>;
  syncLog: SyncLogEntry[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "agri-platform-db.json");

function createSeedData(): LocalDbSnapshot {
  const now = new Date().toISOString();
  const mitidja: FarmRecord = {
    id: "farm_mitidja_01",
    userId: "user_demo_agronomist",
    name: "Mitidja Plain Citrus & Market Estate",
    description:
      "Irrigated alluvial plain parcel south of Algiers evaluated for drip-irrigated citrus and solar groundwater/canal lifting.",
    country: "Algeria",
    region: "Blida / Mitidja Plain",
    centerLat: 36.605,
    centerLon: 2.945,
    elevationM: 76,
    areaHectares: 12.4,
    perimeterMeters: 1440,
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [2.9428, 36.6066],
          [2.9472, 36.6066],
          [2.9472, 36.6034],
          [2.9428, 36.6034],
          [2.9428, 36.6066],
        ],
      ],
    },
    pins: [
      {
        id: "pin_mit_1",
        farmId: "farm_mitidja_01",
        label: "Parcel Centroid",
        role: "FIELD_CENTER",
        latitude: 36.605,
        longitude: 2.945,
        elevationM: 76,
        notes: "Primary orchard block",
        createdAt: now,
      },
      {
        id: "pin_mit_2",
        farmId: "farm_mitidja_01",
        label: "Proposed Solar Array Pad",
        role: "SOLAR_ARRAY",
        latitude: 36.6061,
        longitude: 2.9436,
        elevationM: 78,
        notes: "Unshaded north-edge equipment compound",
        createdAt: now,
      },
      {
        id: "pin_mit_3",
        farmId: "farm_mitidja_01",
        label: "Intake / Borehole Candidate",
        role: "PUMP_INTAKE",
        latitude: 36.6038,
        longitude: 2.9464,
        elevationM: 74,
        notes: "Candidate intake near lower terrace",
        createdAt: now,
      },
    ],
    soilProfile: {
      ...SOIL_TEXTURE_DEFAULTS.CLAY_LOAM,
      source: "Regional Alluvial Baseline (Editable)",
      updatedAt: now,
    },
    solarConfig: {
      capacityKwp: 12.0,
      tiltDeg: 32,
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
      optimizeAngles: false,
      updatedAt: now,
    },
    pumpConfig: {
      flowRateM3Hr: 28,
      staticHeadM: 18,
      pipeLengthM: 220,
      pipeDiameterMm: 90,
      pipeMaterialC: 140,
      frictionLossM: 4.1,
      operatingPressureHeadM: 15,
      totalDynamicHeadM: 37.1,
      pumpEfficiencyPct: 68,
      motorEfficiencyPct: 88,
      operatingHoursDay: 7,
      updatedAt: now,
    },
    irrigationConfig: {
      cropCode: "citrus",
      irrigatedAreaHa: 12.4,
      irrigationMethod: "DRIP",
      applicationEfficiencyPct: IRRIGATION_EFFICIENCY_DEFAULTS.DRIP.efficiencyPct,
      plantingMonth: 3,
    },
    createdAt: now,
    updatedAt: now,
  };

  const guadalquivir: FarmRecord = {
    id: "farm_andalusia_02",
    userId: "user_demo_agronomist",
    name: "Guadalquivir Olive & Solar Parcel",
    description:
      "Mediterranean rolling terrace olive orchard near Cordoba assessed for deficit drip irrigation and PV pump integration.",
    country: "Spain",
    region: "Andalusia / Cordoba",
    centerLat: 37.842,
    centerLon: -4.788,
    elevationM: 112,
    areaHectares: 18.6,
    perimeterMeters: 1750,
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [-4.7905, 37.844],
          [-4.7855, 37.844],
          [-4.7855, 37.84],
          [-4.7905, 37.84],
          [-4.7905, 37.844],
        ],
      ],
    },
    pins: [
      {
        id: "pin_gua_1",
        farmId: "farm_andalusia_02",
        label: "Orchard Center",
        role: "FIELD_CENTER",
        latitude: 37.842,
        longitude: -4.788,
        elevationM: 112,
        notes: "Main olive grove",
        createdAt: now,
      },
    ],
    soilProfile: {
      ...SOIL_TEXTURE_DEFAULTS.LOAM,
      source: "Mediterranean Loam Baseline (Editable)",
      updatedAt: now,
    },
    solarConfig: {
      capacityKwp: 15.0,
      tiltDeg: 34,
      azimuthDeg: 0,
      mountingType: "free",
      systemLossPct: 14,
      optimizeAngles: false,
      updatedAt: now,
    },
    pumpConfig: {
      flowRateM3Hr: 24,
      staticHeadM: 22,
      pipeLengthM: 310,
      pipeDiameterMm: 90,
      pipeMaterialC: 140,
      frictionLossM: 4.3,
      operatingPressureHeadM: 15,
      totalDynamicHeadM: 41.3,
      pumpEfficiencyPct: 66,
      motorEfficiencyPct: 88,
      operatingHoursDay: 6,
      updatedAt: now,
    },
    irrigationConfig: {
      cropCode: "olive",
      irrigatedAreaHa: 18.6,
      irrigationMethod: "DRIP",
      applicationEfficiencyPct: IRRIGATION_EFFICIENCY_DEFAULTS.DRIP.efficiencyPct,
      plantingMonth: 4,
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    farms: [mitidja, guadalquivir],
    analyses: {},
    reports: [],
    conversations: [],
    syncLog: [],
  };
}

let inMemoryFallback: LocalDbSnapshot | null = null;

export function readLocalDb(): LocalDbSnapshot {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seeded = createSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf8");
      inMemoryFallback = seeded;
      return seeded;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as LocalDbSnapshot;
    inMemoryFallback = parsed;
    return parsed;
  } catch {
    if (!inMemoryFallback) {
      inMemoryFallback = createSeedData();
    }
    return inMemoryFallback;
  }
}

export function writeLocalDb(snapshot: LocalDbSnapshot): void {
  inMemoryFallback = snapshot;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {
    // Serverless read-only filesystems fall back to inMemoryFallback safely
  }
}

export function resetLocalDbForTests(snapshot?: LocalDbSnapshot): LocalDbSnapshot {
  const next = snapshot ?? createSeedData();
  writeLocalDb(next);
  return next;
}
