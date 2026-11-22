import { beforeEach, describe, expect, it } from "vitest";
import { POST as createDeviceRoute } from "@/app/api/farms/[id]/devices/route";
import { DELETE as revokeDeviceRoute } from "@/app/api/farms/[id]/devices/[deviceId]/route";
import { POST as ingestReadingsRoute } from "@/app/api/devices/readings/route";
import { GET as getFarmSensorsRoute, POST as postFarmSensorsBleRoute } from "@/app/api/farms/[id]/sensors/route";
import { parseBleSensorPayload } from "@/hooks/useBluetoothSensor";
import { readLocalDb, resetLocalDbForTests } from "@/lib/db/local-store";
import { hashDeviceToken } from "@/lib/db/repository";
import { sensorReadingsPayloadSchema } from "@/lib/validation/schemas";

describe("ESP32 Sensor Devices & Readings API", () => {
  beforeEach(() => {
    resetLocalDbForTests();
  });

  it("validates readings, rejects impossible values, and stores soilFault instead of 0%", () => {
    // Impossible values rejected
    expect(
      sensorReadingsPayloadSchema.safeParse({ airTempC: 120, soilMoisturePct: 40 }).success
    ).toBe(false);
    expect(
      sensorReadingsPayloadSchema.safeParse({ soilMoisturePct: -5 }).success
    ).toBe(false);
    expect(
      sensorReadingsPayloadSchema.safeParse({ soilRaw: 5000 }).success
    ).toBe(false);
    expect(
      sensorReadingsPayloadSchema.safeParse({ waterLevelPct: 140 }).success
    ).toBe(false);
    expect(
      sensorReadingsPayloadSchema.safeParse({}).success
    ).toBe(false);

    // Batches above 50 readings rejected
    const fiftyOne = Array.from({ length: 51 }, () => ({ airTempC: 25, soilRaw: 2100 }));
    expect(sensorReadingsPayloadSchema.safeParse(fiftyOne).success).toBe(false);

    // Fault-flagged raw reading >= 4000 must become soilFault=true and soilMoisturePct=null (never 0%)
    const faultParsed = sensorReadingsPayloadSchema.safeParse({
      airTempC: 28.5,
      airHumidityPct: 52,
      soilRaw: 4095,
      soilMoisturePct: 0,
      waterRaw: 1500,
      waterLevelPct: 73,
      pumpOn: false,
    });
    expect(faultParsed.success).toBe(true);
    if (faultParsed.success) {
      expect(faultParsed.data[0].soilFault).toBe(true);
      expect(faultParsed.data[0].soilMoisturePct).toBeNull();
    }
  });

  it("creates device key once (hashed at rest), refuses wrong/revoked keys, and supports batch upload", async () => {
    // 1. Owner creates a sensor device for demo farm
    const createReq = new Request("http://localhost:3000/api/farms/farm_mitidja_01/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.11" },
      body: JSON.stringify({ name: "Olive Block Node" }),
    });
    const createRes = await createDeviceRoute(createReq, {
      params: Promise.resolve({ id: "farm_mitidja_01" }),
    });
    expect(createRes.status).toBe(201);
    const createdJson = (await createRes.json()) as {
      device: { id: string; name: string };
      deviceKey: string;
    };
    expect(createdJson.deviceKey).toMatch(/^tp_dev_/);

    // DB stores only SHA-256 hash, never raw key
    const dbAfterCreate = readLocalDb();
    const storedDev = dbAfterCreate.sensorDevices?.find((d) => d.id === createdJson.device.id);
    expect(storedDev).toBeDefined();
    expect(storedDev?.tokenHash).toBe(hashDeviceToken(createdJson.deviceKey));
    expect(storedDev?.tokenHash).not.toBe(createdJson.deviceKey);

    // 2. Wrong key & missing key are refused (401)
    const missingKeyRes = await ingestReadingsRoute(
      new Request("http://localhost:3000/api/devices/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.12" },
        body: JSON.stringify({ airTempC: 26, soilMoisturePct: 35 }),
      })
    );
    expect(missingKeyRes.status).toBe(401);

    const wrongKeyRes = await ingestReadingsRoute(
      new Request("http://localhost:3000/api/devices/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer tp_dev_wrong_key_123",
          "x-forwarded-for": "10.0.0.13",
        },
        body: JSON.stringify({ airTempC: 26, soilMoisturePct: 35 }),
      })
    );
    expect(wrongKeyRes.status).toBe(401);

    // 3. Batch upload of 12 offline readings + latest soilFault sample succeeds and updates lastSeenAt
    const batchPayload = {
      readings: [
        ...Array.from({ length: 11 }, (_, idx) => ({
          ageSeconds: (11 - idx) * 60,
          airTempC: 25 + idx * 0.2,
          airHumidityPct: 50,
          soilRaw: 2300,
          soilMoisturePct: 38,
          waterRaw: 1600,
          waterLevelPct: 78,
          pumpOn: idx === 10,
        })),
        {
          ageSeconds: 0,
          airTempC: 29.4,
          airHumidityPct: 45,
          soilRaw: 4050,
          soilMoisturePct: 0,
          waterRaw: 1620,
          waterLevelPct: 79,
          pumpOn: false,
        },
      ],
    };
    const batchRes = await ingestReadingsRoute(
      new Request("http://localhost:3000/api/devices/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${createdJson.deviceKey}`,
          "x-forwarded-for": "10.0.0.14",
        },
        body: JSON.stringify(batchPayload),
      })
    );
    expect(batchRes.status).toBe(201);
    const batchJson = (await batchRes.json()) as {
      accepted: number;
      latestReading: { soilFault: boolean; soilMoisturePct: number | null; airTempC: number };
    };
    expect(batchJson.accepted).toBe(12);
    expect(batchJson.latestReading.soilFault).toBe(true);
    expect(batchJson.latestReading.soilMoisturePct).toBeNull();
    expect(batchJson.latestReading.airTempC).toBe(29.4);

    // 4. GET /api/farms/[id]/sensors returns device with updated lastSeenAt and 24h readings
    const sensorsRes = await getFarmSensorsRoute(
      new Request("http://localhost:3000/api/farms/farm_mitidja_01/sensors", {
        headers: { "x-forwarded-for": "10.0.0.15" },
      }),
      { params: Promise.resolve({ id: "farm_mitidja_01" }) }
    );
    expect(sensorsRes.status).toBe(200);
    const sensorsJson = (await sensorsRes.json()) as {
      devices: Array<{ id: string; lastSeenAt: string | null }>;
      readings24h: Array<{ id: string }>;
      latestReading: { soilFault: boolean; soilMoisturePct: number | null } | null;
    };
    expect(sensorsJson.devices).toHaveLength(1);
    expect(sensorsJson.devices[0].lastSeenAt).not.toBeNull();
    expect(sensorsJson.readings24h).toHaveLength(12);
    expect(sensorsJson.latestReading?.soilFault).toBe(true);
    expect(sensorsJson.latestReading?.soilMoisturePct).toBeNull();

    // 5. Revoking the device causes future uploads with that key to be refused (401)
    const revokeRes = await revokeDeviceRoute(
      new Request(
        `http://localhost:3000/api/farms/farm_mitidja_01/devices/${createdJson.device.id}`,
        { method: "DELETE", headers: { "x-forwarded-for": "10.0.0.16" } }
      ),
      { params: Promise.resolve({ id: "farm_mitidja_01", deviceId: createdJson.device.id }) }
    );
    expect(revokeRes.status).toBe(200);

    const postAfterRevoke = await ingestReadingsRoute(
      new Request("http://localhost:3000/api/devices/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${createdJson.deviceKey}`,
          "x-forwarded-for": "10.0.0.17",
        },
        body: JSON.stringify({ airTempC: 27, soilMoisturePct: 50 }),
      })
    );
    expect(postAfterRevoke.status).toBe(401);
  });

  it("parses compact ESP32 Bluetooth JSON payloads and saves owner BLE readings", async () => {
    const valid = parseBleSensorPayload(
      '{"t":29.4,"h":48,"sr":2450,"sm":24,"sf":0,"wr":1680,"wl":82,"p":1}',
      "farm_mitidja_01"
    );
    expect(valid).not.toBeNull();
    expect(valid?.airTempC).toBe(29.4);
    expect(valid?.soilMoisturePct).toBe(24);
    expect(valid?.waterLevelPct).toBe(82);
    expect(valid?.pumpOn).toBe(true);
    expect(valid?.soilFault).toBe(false);

    const fault = parseBleSensorPayload(
      '{"t":27.0,"h":50,"sr":4095,"sm":0,"sf":1,"wr":1500,"wl":75,"p":0}',
      "farm_mitidja_01"
    );
    expect(fault?.soilFault).toBe(true);
    expect(fault?.soilMoisturePct).toBeNull();

    expect(parseBleSensorPayload('{"t":140}', "farm_mitidja_01")).toBeNull();

    const bleRes = await postFarmSensorsBleRoute(
      new Request("http://localhost:3000/api/farms/farm_mitidja_01/sensors", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.21" },
        body: JSON.stringify({
          deviceName: "TerraPulse-Node (Bluetooth)",
          reading: {
            airTempC: 28.5,
            airHumidityPct: 51,
            soilRaw: 2400,
            soilMoisturePct: 26,
            waterRaw: 1700,
            waterLevelPct: 83,
            pumpOn: true,
          },
        }),
      }),
      { params: Promise.resolve({ id: "farm_mitidja_01" }) }
    );
    expect(bleRes.status).toBe(201);
    const bleBundle = (await bleRes.json()) as {
      devices: Array<{ name: string }>;
      latestReading: { airTempC: number; soilMoisturePct: number; pumpOn: boolean } | null;
    };
    expect(bleBundle.devices[0]?.name).toBe("TerraPulse-Node (Bluetooth)");
    expect(bleBundle.latestReading?.airTempC).toBe(28.5);
    expect(bleBundle.latestReading?.soilMoisturePct).toBe(26);
    expect(bleBundle.latestReading?.pumpOn).toBe(true);
  });
});
