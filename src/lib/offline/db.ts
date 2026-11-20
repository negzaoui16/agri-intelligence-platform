import Dexie, { type Table } from "dexie";
import type {
  AIChatMessageRecord,
  CompleteFarmAnalysisBundle,
  FarmerProfileRecord,
  FarmRecord,
  FeasibilityReportPayload,
  OnboardingProgressRecord,
  SyncQueueItem,
} from "@/types/agri";

export interface OfflineFarmRow extends FarmRecord {
  syncStatus: "SYNCED" | "PENDING" | "CONFLICT";
}

export interface OfflineOnboardingRow {
  userId: string;
  profile?: FarmerProfileRecord | null;
  progress?: OnboardingProgressRecord | null;
  farm?: FarmRecord | null;
  updatedAt: string;
}

export interface OfflineAnalysisRow {
  id: string;
  farmId: string;
  type: "COMPLETE_BUNDLE";
  retrievedAt: string;
  payload: CompleteFarmAnalysisBundle;
}

export interface OfflineConversationRow {
  id: string;
  farmId: string;
  messages: AIChatMessageRecord[];
  updatedAt: string;
}

export interface OfflineSettingRow {
  key: string;
  value: unknown;
}

class AgriOfflineDB extends Dexie {
  farms!: Table<OfflineFarmRow, string>;
  analyses!: Table<OfflineAnalysisRow, string>;
  reports!: Table<FeasibilityReportPayload, string>;
  conversations!: Table<OfflineConversationRow, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  settings!: Table<OfflineSettingRow, string>;
  onboarding!: Table<OfflineOnboardingRow, string>;

  constructor() {
    super("terrapulse_agri_db_v1");
    this.version(1).stores({
      farms: "id, name, country, region, updatedAt, syncStatus",
      analyses: "id, farmId, type, retrievedAt",
      reports: "id, farmId, createdAt",
      conversations: "id, farmId, updatedAt",
      syncQueue: "++seq, operationId, entityType, entityId, action, clientTimestamp, status",
      settings: "key",
    });
    this.version(2).stores({
      farms: "id, name, country, region, updatedAt, syncStatus",
      analyses: "id, farmId, type, retrievedAt",
      reports: "id, farmId, createdAt",
      conversations: "id, farmId, updatedAt",
      syncQueue: "++seq, operationId, entityType, entityId, action, clientTimestamp, status",
      settings: "key",
      onboarding: "userId, updatedAt",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new AgriOfflineDB() : null;
