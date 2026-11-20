-- Migration 0002: Authentication + 5-Stage Farmer Onboarding Experience
-- Preserves all existing tables and relationships safely

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'EMAIL',
  ADD COLUMN IF NOT EXISTS "googleId" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "resetTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "resetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

ALTER TABLE "Farm"
  ADD COLUMN IF NOT EXISTS "governorate" TEXT,
  ADD COLUMN IF NOT EXISTS "delegation" TEXT,
  ADD COLUMN IF NOT EXISTS "locality" TEXT,
  ADD COLUMN IF NOT EXISTS "boundaryVerified" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SolarConfiguration"
  ADD COLUMN IF NOT EXISTS "solarStatus" TEXT NOT NULL DEFAULT 'YES',
  ADD COLUMN IF NOT EXISTS "panelCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "panelWattageW" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "hasBattery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "batteryCapacityKwh" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "hasGridConnection" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wantsEstimate" TEXT,
  ADD COLUMN IF NOT EXISTS "budgetAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "isFarmerProvided" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PumpConfiguration"
  ADD COLUMN IF NOT EXISTS "hasPump" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pumpType" TEXT,
  ADD COLUMN IF NOT EXISTS "powerKw" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "isFarmerProvided" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "FarmerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT,
  "avatarUrl" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Tunisia',
  "governorate" TEXT,
  "delegation" TEXT,
  "locality" TEXT,
  "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  "preferredUnits" TEXT NOT NULL DEFAULT 'metric',
  "experienceLevel" TEXT NOT NULL DEFAULT 'YEARS_2_5',
  "activityType" TEXT NOT NULL DEFAULT 'SMALL_FAMILY_FARM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FarmerProfile_userId_key" ON "FarmerProfile"("userId");

CREATE TABLE IF NOT EXISTS "OnboardingProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "activeFarmId" TEXT,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completedSteps" JSONB NOT NULL DEFAULT '[]',
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "draftJson" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");

CREATE TABLE IF NOT EXISTS "FarmCrop" (
  "id" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "cropCode" TEXT NOT NULL,
  "cropName" TEXT NOT NULL,
  "cultivatedAreaHa" DOUBLE PRECISION NOT NULL,
  "areaUnit" TEXT NOT NULL DEFAULT 'ha',
  "plantingDate" TEXT,
  "growthStage" TEXT,
  "plotCount" INTEGER NOT NULL DEFAULT 1,
  "plantingDensity" TEXT,
  "irrigationMethod" TEXT NOT NULL DEFAULT 'DRIP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FarmCrop_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FarmCrop_farmId_idx" ON "FarmCrop"("farmId");

CREATE TABLE IF NOT EXISTS "WaterConfiguration" (
  "id" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "distanceMeters" DOUBLE PRECISION,
  "availability" TEXT,
  "wellDepthM" DOUBLE PRECISION,
  "flowRateM3Hr" DOUBLE PRECISION,
  "waterQualityNotes" TEXT,
  "isFarmerProvided" BOOLEAN NOT NULL DEFAULT true,
  "geom" geometry(Point, 4326),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaterConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WaterConfiguration_farmId_idx" ON "WaterConfiguration"("farmId");
CREATE INDEX IF NOT EXISTS "WaterConfiguration_geom_idx" ON "WaterConfiguration" USING GIST ("geom");

ALTER TABLE "FarmerProfile" ADD CONSTRAINT "FarmerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmCrop" ADD CONSTRAINT "FarmCrop_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaterConfiguration" ADD CONSTRAINT "WaterConfiguration_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
