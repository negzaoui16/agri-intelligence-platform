-- Migration 0003: persist every FarmRecord field in Postgres (no more local-only fields)

-- Irrigation method lives on the farm as TEXT: the IrrigationMethod enum lacks MANUAL / NONE / OTHER
ALTER TABLE "Farm"
  ADD COLUMN IF NOT EXISTS "irrigationMethod" TEXT NOT NULL DEFAULT 'DRIP',
  ADD COLUMN IF NOT EXISTS "allowCropOverlap" BOOLEAN NOT NULL DEFAULT false;

-- Hazen-Williams roughness coefficient was previously hard-coded to 140 on read
ALTER TABLE "PumpConfiguration"
  ADD COLUMN IF NOT EXISTS "pipeMaterialC" DOUBLE PRECISION NOT NULL DEFAULT 140;

-- Reports need an owner-independent fetch order
CREATE INDEX IF NOT EXISTS "FeasibilityReport_createdAt_idx" ON "FeasibilityReport"("createdAt");

-- Supabase exposes the public schema through its REST API; keep these tables private
-- (the app connects as a BYPASSRLS role over a direct Postgres connection)
DO $$
DECLARE t record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
  END IF;
END $$;
