-- Migration 0005: FarmBrain Analysis, Decision Simulator, and ML Metadata tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SimulationScenarioType') THEN
    CREATE TYPE "SimulationScenarioType" AS ENUM (
      'WATER_SHORTAGE',
      'CHANGE_CROP',
      'WEATHER_CLIMATE',
      'IRRIGATION_STRATEGY',
      'FARM_EXPANSION'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FarmBrainAnalysis" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dataCompletenessPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completenessJson" JSONB NOT NULL,
    "savingsJson" JSONB NOT NULL,
    "verifiedTrackingJson" JSONB NOT NULL,
    "forecastJson" JSONB NOT NULL,
    "plotBreakdownsJson" JSONB NOT NULL,
    "recommendationsJson" JSONB NOT NULL,
    "soilAnomalyDetected" BOOLEAN NOT NULL DEFAULT false,
    "soilAnomalyReason" TEXT,
    "mlModelsJson" JSONB NOT NULL,
    "assumptionsJson" JSONB NOT NULL,
    "limitationsJson" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmBrainAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SimulationScenario" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scenarioType" "SimulationScenarioType" NOT NULL,
    "inputsJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MLModelMetadata" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "targetVariable" TEXT NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL,
    "rmse" DOUBLE PRECISION NOT NULL,
    "r2" DOUBLE PRECISION NOT NULL,
    "trainSamples" INTEGER NOT NULL,
    "testSamples" INTEGER NOT NULL,
    "featureNames" JSONB NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLModelMetadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MLPredictionLog" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputSummary" JSONB NOT NULL,
    "outputSummary" JSONB NOT NULL,
    "provenance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLPredictionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FarmBrainAnalysis_farmId_generatedAt_idx" ON "FarmBrainAnalysis"("farmId", "generatedAt");
CREATE INDEX IF NOT EXISTS "FarmBrainAnalysis_userId_updatedAt_idx" ON "FarmBrainAnalysis"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "SimulationScenario_farmId_updatedAt_idx" ON "SimulationScenario"("farmId", "updatedAt");
CREATE INDEX IF NOT EXISTS "SimulationScenario_userId_isArchived_idx" ON "SimulationScenario"("userId", "isArchived");
CREATE UNIQUE INDEX IF NOT EXISTS "MLModelMetadata_modelName_key" ON "MLModelMetadata"("modelName");
CREATE INDEX IF NOT EXISTS "MLPredictionLog_farmId_createdAt_idx" ON "MLPredictionLog"("farmId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FarmBrainAnalysis_farmId_fkey') THEN
    ALTER TABLE "FarmBrainAnalysis"
      ADD CONSTRAINT "FarmBrainAnalysis_farmId_fkey"
      FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FarmBrainAnalysis_userId_fkey') THEN
    ALTER TABLE "FarmBrainAnalysis"
      ADD CONSTRAINT "FarmBrainAnalysis_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SimulationScenario_farmId_fkey') THEN
    ALTER TABLE "SimulationScenario"
      ADD CONSTRAINT "SimulationScenario_farmId_fkey"
      FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SimulationScenario_userId_fkey') THEN
    ALTER TABLE "SimulationScenario"
      ADD CONSTRAINT "SimulationScenario_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MLPredictionLog_farmId_fkey') THEN
    ALTER TABLE "MLPredictionLog"
      ADD CONSTRAINT "MLPredictionLog_farmId_fkey"
      FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'FarmBrainAnalysis',
    'SimulationScenario',
    'MLModelMetadata',
    'MLPredictionLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
    END IF;
  END LOOP;
END $$;
