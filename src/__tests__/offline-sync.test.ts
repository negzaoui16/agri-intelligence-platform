import { describe, expect, it, beforeEach } from "vitest";
import { resetLocalDbForTests } from "@/lib/db/local-store";
import { listFarms, processSyncOperations } from "@/lib/db/repository";

describe("Offline-First Synchronization & Conflict Handling", () => {
  beforeEach(() => {
    resetLocalDbForTests();
  });

  it("applies new farm offline operation and deduplicates idempotent replays", async () => {
    const opId = "op_test_create_001";
    const clientTime = new Date().toISOString();

    const first = await processSyncOperations("user_demo_agronomist", [
      {
        operationId: opId,
        entityType: "FARM",
        entityId: "farm_offline_test_1",
        action: "CREATE",
        clientTimestamp: clientTime,
        payload: {
          name: "Offline Created Parcel",
          centerLat: 36.7,
          centerLon: 3.1,
          areaHectares: 4.5,
        },
      },
    ]);

    expect(first[0].status).toBe("APPLIED");

    // Duplicate replay must not create duplicates or re-apply
    const replay = await processSyncOperations("user_demo_agronomist", [
      {
        operationId: opId,
        entityType: "FARM",
        entityId: "farm_offline_test_1",
        action: "CREATE",
        clientTimestamp: clientTime,
        payload: {
          name: "Offline Created Parcel",
          centerLat: 36.7,
          centerLon: 3.1,
          areaHectares: 4.5,
        },
      },
    ]);

    expect(replay[0].status).toBe("APPLIED");
    expect(replay[0].reason).toContain("Idempotent replay");

    const farms = await listFarms("user_demo_agronomist");
    expect(farms.filter((f) => f.id === "farm_offline_test_1")).toHaveLength(1);
  });

  it("detects conflict instead of silently overwriting newer server-side data", async () => {
    const staleClientTimestamp = new Date(Date.now() - 86_400_000).toISOString(); // 24h older than seeded farm
    const res = await processSyncOperations("user_demo_agronomist", [
      {
        operationId: "op_stale_update_002",
        entityType: "FARM",
        entityId: "farm_mitidja_01",
        action: "UPDATE",
        clientTimestamp: staleClientTimestamp,
        payload: {
          name: "Stale Offline Overwrite Attempt",
          centerLat: 36.605,
          centerLon: 2.945,
        },
      },
    ]);

    expect(res[0].status).toBe("CONFLICT");
    expect(res[0].serverRecord).toBeDefined();

    const farms = await listFarms("user_demo_agronomist");
    const serverFarm = farms.find((f) => f.id === "farm_mitidja_01");
    expect(serverFarm?.name).toBe("Mitidja Plain Citrus & Market Estate");
  });
});
