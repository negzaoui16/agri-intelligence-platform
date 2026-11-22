-- Migration 0004: ESP32 SensorDevice and SensorReading models

CREATE TABLE IF NOT EXISTS "SensorDevice" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SensorDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SensorReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "airTempC" DOUBLE PRECISION,
    "airHumidityPct" DOUBLE PRECISION,
    "soilMoisturePct" DOUBLE PRECISION,
    "soilRaw" INTEGER,
    "waterLevelPct" DOUBLE PRECISION,
    "waterRaw" INTEGER,
    "pumpOn" BOOLEAN NOT NULL DEFAULT false,
    "soilFault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SensorDevice_tokenHash_key" ON "SensorDevice"("tokenHash");
CREATE INDEX IF NOT EXISTS "SensorDevice_farmId_idx" ON "SensorDevice"("farmId");
CREATE INDEX IF NOT EXISTS "SensorDevice_tokenHash_idx" ON "SensorDevice"("tokenHash");
CREATE INDEX IF NOT EXISTS "SensorReading_farmId_recordedAt_idx" ON "SensorReading"("farmId", "recordedAt");
CREATE INDEX IF NOT EXISTS "SensorReading_deviceId_recordedAt_idx" ON "SensorReading"("deviceId", "recordedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SensorDevice_farmId_fkey'
  ) THEN
    ALTER TABLE "SensorDevice"
      ADD CONSTRAINT "SensorDevice_farmId_fkey"
      FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SensorReading_deviceId_fkey'
  ) THEN
    ALTER TABLE "SensorReading"
      ADD CONSTRAINT "SensorReading_deviceId_fkey"
      FOREIGN KEY ("deviceId") REFERENCES "SensorDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SensorReading_farmId_fkey'
  ) THEN
    ALTER TABLE "SensorReading"
      ADD CONSTRAINT "SensorReading_farmId_fkey"
      FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Keep tables private from Supabase anon REST API
DO $$
DECLARE t record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('SensorDevice', 'SensorReading') LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
  END IF;
END $$;
