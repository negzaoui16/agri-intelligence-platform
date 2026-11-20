import type {
  CompleteFarmAnalysisBundle,
  FarmerProfileRecord,
  FarmRecord,
  FeasibilityReportPayload,
  OnboardingProgressRecord,
  SyncQueueItem,
} from "@/types/agri";
import { offlineDb, type OfflineFarmRow, type OfflineOnboardingRow } from "./db";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function cacheFarmsLocally(farms: FarmRecord[]): Promise<void> {
  if (!offlineDb) return;
  const pendingIds = new Set(
    (await offlineDb.syncQueue.where("status").anyOf(["PENDING", "CONFLICT"]).toArray()).map(
      (q) => q.entityId
    )
  );
  for (const farm of farms) {
    // Do not overwrite unsynced local edits
    if (pendingIds.has(farm.id)) continue;
    await offlineDb.farms.put({
      ...farm,
      syncStatus: "SYNCED",
    });
  }
}

export async function getLocalFarms(): Promise<OfflineFarmRow[]> {
  if (!offlineDb) return [];
  return offlineDb.farms.orderBy("updatedAt").reverse().toArray();
}

export async function saveFarmOfflineFirst(
  farm: FarmRecord,
  action: "CREATE" | "UPDATE"
): Promise<{ farm: OfflineFarmRow; queued: SyncQueueItem }> {
  const now = new Date().toISOString();
  const row: OfflineFarmRow = {
    ...farm,
    updatedAt: now,
    syncStatus: "PENDING",
  };
  const queueItem: SyncQueueItem = {
    operationId: generateUuid(),
    entityType: "FARM",
    entityId: farm.id,
    action,
    payload: farm,
    clientTimestamp: now,
    status: "PENDING",
  };

  if (offlineDb) {
    await offlineDb.farms.put(row);
    await offlineDb.syncQueue.add(queueItem);
  }
  return { farm: row, queued: queueItem };
}

export async function deleteFarmOfflineFirst(farmId: string): Promise<void> {
  const now = new Date().toISOString();
  if (!offlineDb) return;
  await offlineDb.farms.delete(farmId);
  await offlineDb.analyses.where("farmId").equals(farmId).delete();
  await offlineDb.reports.where("farmId").equals(farmId).delete();
  await offlineDb.syncQueue.add({
    operationId: generateUuid(),
    entityType: "FARM",
    entityId: farmId,
    action: "DELETE",
    payload: { id: farmId },
    clientTimestamp: now,
    status: "PENDING",
  });
}

export async function cacheAnalysisLocally(
  bundle: CompleteFarmAnalysisBundle
): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.analyses.put({
    id: `bundle_${bundle.farmId}`,
    farmId: bundle.farmId,
    type: "COMPLETE_BUNDLE",
    retrievedAt: bundle.generatedAt,
    payload: bundle,
  });
}

export async function getLocalAnalysis(
  farmId: string
): Promise<CompleteFarmAnalysisBundle | null> {
  if (!offlineDb) return null;
  const row = await offlineDb.analyses.get(`bundle_${farmId}`);
  return row?.payload ?? null;
}

export async function cacheReportsLocally(
  reports: FeasibilityReportPayload[]
): Promise<void> {
  if (!offlineDb) return;
  for (const r of reports) {
    await offlineDb.reports.put(r);
  }
}

export async function getLocalReports(
  farmId?: string
): Promise<FeasibilityReportPayload[]> {
  if (!offlineDb) return [];
  if (farmId) {
    return offlineDb.reports.where("farmId").equals(farmId).reverse().sortBy("createdAt");
  }
  return offlineDb.reports.orderBy("createdAt").reverse().toArray();
}

export async function getPendingSyncCount(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.syncQueue.where("status").anyOf(["PENDING", "ERROR"]).count();
}

export async function getSyncConflicts(): Promise<SyncQueueItem[]> {
  if (!offlineDb) return [];
  return offlineDb.syncQueue.where("status").equals("CONFLICT").toArray();
}

export async function flushSyncQueue(): Promise<{
  applied: number;
  conflicts: SyncQueueItem[];
  failed: number;
}> {
  if (!offlineDb || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return { applied: 0, conflicts: [], failed: 0 };
  }

  const pending = await offlineDb.syncQueue
    .where("status")
    .anyOf(["PENDING", "ERROR"])
    .toArray();

  if (pending.length === 0) {
    return { applied: 0, conflicts: await getSyncConflicts(), failed: 0 };
  }

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: pending.map((op) => ({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          payload: op.payload,
          clientTimestamp: op.clientTimestamp,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Sync HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      results: Array<{
        operationId: string;
        status: "APPLIED" | "CONFLICT" | "REJECTED";
        reason?: string;
        serverRecord?: unknown;
      }>;
      farms?: FarmRecord[];
    };

    let applied = 0;
    const conflicts: SyncQueueItem[] = [];

    for (const outcome of json.results) {
      const localItem = pending.find((p) => p.operationId === outcome.operationId);
      if (!localItem || localItem.seq === undefined) continue;

      if (outcome.status === "APPLIED") {
        applied += 1;
        await offlineDb.syncQueue.delete(localItem.seq);
        const existingFarm = await offlineDb.farms.get(localItem.entityId);
        if (existingFarm) {
          await offlineDb.farms.update(localItem.entityId, { syncStatus: "SYNCED" });
        }
      } else if (outcome.status === "CONFLICT") {
        const conflictItem: SyncQueueItem = {
          ...localItem,
          status: "CONFLICT",
          conflictServerRecord: outcome.serverRecord,
          errorMessage: outcome.reason,
        };
        await offlineDb.syncQueue.update(localItem.seq, {
          status: "CONFLICT",
          conflictServerRecord: outcome.serverRecord,
          errorMessage: outcome.reason,
        });
        const existingFarm = await offlineDb.farms.get(localItem.entityId);
        if (existingFarm) {
          await offlineDb.farms.update(localItem.entityId, { syncStatus: "CONFLICT" });
        }
        conflicts.push(conflictItem);
      } else {
        await offlineDb.syncQueue.update(localItem.seq, {
          status: "ERROR",
          errorMessage: outcome.reason,
        });
      }
    }

    if (json.farms) {
      await cacheFarmsLocally(json.farms);
    }

    return { applied, conflicts, failed: 0 };
  } catch (err) {
    for (const item of pending) {
      if (item.seq !== undefined) {
        await offlineDb.syncQueue.update(item.seq, {
          status: "ERROR",
          errorMessage: err instanceof Error ? err.message : "Network error",
        });
      }
    }
    return { applied: 0, conflicts: await getSyncConflicts(), failed: pending.length };
  }
}

export async function resolveConflictItem(
  seq: number,
  resolution: "KEEP_LOCAL" | "ACCEPT_SERVER"
): Promise<void> {
  if (!offlineDb) return;
  const item = await offlineDb.syncQueue.get(seq);
  if (!item) return;

  if (resolution === "ACCEPT_SERVER") {
    const serverFarm = item.conflictServerRecord as FarmRecord | undefined;
    if (serverFarm?.id) {
      await offlineDb.farms.put({ ...serverFarm, syncStatus: "SYNCED" });
    }
    await offlineDb.syncQueue.delete(seq);
  } else {
    // Force bump timestamp so next sync wins cleanly
    const now = new Date().toISOString();
    await offlineDb.syncQueue.update(seq, {
      operationId: generateUuid(),
      clientTimestamp: now,
      status: "PENDING",
      errorMessage: undefined,
    });
    await flushSyncQueue();
  }
}

export async function saveOnboardingOffline(params: {
  userId: string;
  profile?: FarmerProfileRecord | null;
  progress?: OnboardingProgressRecord | null;
  farm?: FarmRecord | null;
  queueSync?: boolean;
}): Promise<void> {
  if (!offlineDb) return;
  const now = new Date().toISOString();
  await offlineDb.onboarding.put({
    userId: params.userId,
    profile: params.profile ?? null,
    progress: params.progress ?? null,
    farm: params.farm ?? null,
    updatedAt: now,
  });

  if (params.queueSync) {
    await offlineDb.syncQueue.add({
      operationId: generateUuid(),
      entityType: "ONBOARDING",
      entityId: params.userId,
      action: "UPDATE",
      payload: {
        profile: params.profile,
        progress: params.progress,
      },
      clientTimestamp: now,
      status: "PENDING",
    });
    if (params.farm) {
      await offlineDb.farms.put({ ...params.farm, syncStatus: "PENDING" });
      await offlineDb.syncQueue.add({
        operationId: generateUuid(),
        entityType: "FARM",
        entityId: params.farm.id,
        action: "UPDATE",
        payload: params.farm,
        clientTimestamp: now,
        status: "PENDING",
      });
    }
  }
}

export async function getOfflineOnboarding(
  userId: string
): Promise<OfflineOnboardingRow | null> {
  if (!offlineDb) return null;
  return (await offlineDb.onboarding.get(userId)) ?? null;
}

export async function clearUserLocalCacheOnLogout(): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.farms.clear();
  await offlineDb.analyses.clear();
  await offlineDb.reports.clear();
  await offlineDb.onboarding.clear();
}
