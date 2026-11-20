-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum types
CREATE TYPE "PinRole" AS ENUM ('FIELD_CENTER', 'WELL_CANDIDATE', 'SOLAR_ARRAY', 'PUMP_INTAKE', 'SOIL_SAMPLE', 'CUSTOM');
CREATE TYPE "SoilTextureClass" AS ENUM ('SANDY', 'SANDY_LOAM', 'LOAM', 'SILT_LOAM', 'CLAY_LOAM', 'CLAY');
CREATE TYPE "WaterSourceType" AS ENUM ('RIVER', 'STREAM', 'CANAL', 'LAKE', 'RESERVOIR', 'WELL', 'SPRING', 'WATER_INFRASTRUCTURE');
CREATE TYPE "WaterProvider" AS ENUM ('OSM_OVERPASS', 'HYDRORIVERS', 'HYDROSHEDS');
CREATE TYPE "WeatherObservationType" AS ENUM ('CURRENT_FORECAST', 'HISTORICAL_ARCHIVE');
CREATE TYPE "IrrigationMethod" AS ENUM ('DRIP', 'SUBSURFACE_DRIP', 'SPRINKLER', 'CENTER_PIVOT', 'FURROW');
CREATE TYPE "FeasibilityVerdict" AS ENUM ('HIGHLY_FEASIBLE', 'FEASIBLE_WITH_MITIGATION', 'CONDITIONAL', 'HIGH_RISK');
CREATE TYPE "SyncAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE "SyncStatus" AS ENUM ('APPLIED', 'CONFLICT', 'REJECTED');

-- User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FARMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Farm table
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT,
    "region" TEXT,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLon" DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION,
    "areaHectares" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "perimeterMeters" DOUBLE PRECISION NOT NULL DEFAULT 400.0,
    "primaryCropCode" TEXT NOT NULL DEFAULT 'tomato',
    "plantingMonth" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Farm_userId_idx" ON "Farm"("userId");
CREATE INDEX "Farm_centerLat_centerLon_idx" ON "Farm"("centerLat", "centerLon");

-- FarmBoundary table with PostGIS geometry(Polygon, 4326) & GIST index
CREATE TABLE "FarmBoundary" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "geojson" JSONB NOT NULL,
    "areaHectares" DOUBLE PRECISION NOT NULL,
    "perimeterMeters" DOUBLE PRECISION NOT NULL,
    "geom" geometry(Polygon, 4326),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FarmBoundary_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FarmBoundary_farmId_key" ON "FarmBoundary"("farmId");
CREATE INDEX "FarmBoundary_geom_idx" ON "FarmBoundary" USING GIST ("geom");

-- FarmLocation (Pins) table with PostGIS geometry(Point, 4326) & GIST index
CREATE TABLE "FarmLocation" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "role" "PinRole" NOT NULL DEFAULT 'CUSTOM',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION,
    "notes" TEXT,
    "geom" geometry(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FarmLocation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FarmLocation_farmId_idx" ON "FarmLocation"("farmId");
CREATE INDEX "FarmLocation_geom_idx" ON "FarmLocation" USING GIST ("geom");

-- Crop catalog
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kcIni" DOUBLE PRECISION NOT NULL,
    "kcMid" DOUBLE PRECISION NOT NULL,
    "kcEnd" DOUBLE PRECISION NOT NULL,
    "stageIniDays" INTEGER NOT NULL,
    "stageDevDays" INTEGER NOT NULL,
    "stageMidDays" INTEGER NOT NULL,
    "stageLateDays" INTEGER NOT NULL,
    "rootDepthMinM" DOUBLE PRECISION NOT NULL,
    "rootDepthMaxM" DOUBLE PRECISION NOT NULL,
    "depletionFractionP" DOUBLE PRECISION NOT NULL,
    "yieldResponseKy" DOUBLE PRECISION NOT NULL,
    "optimalTempMinC" DOUBLE PRECISION NOT NULL,
    "optimalTempMaxC" DOUBLE PRECISION NOT NULL,
    "droughtTolerance" TEXT NOT NULL,
    "salinityToleranceDsm" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Crop_code_key" ON "Crop"("code");

-- SoilProfile table
CREATE TABLE "SoilProfile" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "textureClass" "SoilTextureClass" NOT NULL DEFAULT 'LOAM',
    "fieldCapacityMmM" DOUBLE PRECISION NOT NULL,
    "wiltingPointMmM" DOUBLE PRECISION NOT NULL,
    "tawMmM" DOUBLE PRECISION NOT NULL,
    "infiltrationRateMmHr" DOUBLE PRECISION NOT NULL,
    "organicMatterPct" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'USER_INPUT_OR_DEFAULT',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SoilProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SoilProfile_farmId_key" ON "SoilProfile"("farmId");

-- WaterSource table with PostGIS geometry(Point, 4326) & GIST index
CREATE TABLE "WaterSource" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "WaterSourceType" NOT NULL,
    "provider" "WaterProvider" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "bearingDegrees" DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION,
    "elevationDiffM" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL,
    "operationalVerified" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" JSONB,
    "geom" geometry(Point, 4326),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaterSource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WaterSource_farmId_idx" ON "WaterSource"("farmId");
CREATE INDEX "WaterSource_geom_idx" ON "WaterSource" USING GIST ("geom");

-- WeatherObservation table
CREATE TABLE "WeatherObservation" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "observationType" "WeatherObservationType" NOT NULL,
    "currentTempC" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "windSpeedKmh" DOUBLE PRECISION,
    "windDirectionDeg" DOUBLE PRECISION,
    "annualPrecipMm" DOUBLE PRECISION,
    "annualEt0Mm" DOUBLE PRECISION,
    "payloadJson" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeatherObservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WeatherObservation_farmId_observationType_idx" ON "WeatherObservation"("farmId", "observationType");

-- SolarConfiguration table
CREATE TABLE "SolarConfiguration" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "capacityKwp" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "tiltDeg" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "azimuthDeg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "mountingType" TEXT NOT NULL DEFAULT 'free',
    "systemLossPct" DOUBLE PRECISION NOT NULL DEFAULT 14.0,
    "optimizeAngles" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SolarConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SolarConfiguration_farmId_key" ON "SolarConfiguration"("farmId");

-- SolarAnalysis table
CREATE TABLE "SolarAnalysis" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "solarConfigId" TEXT,
    "dailyAvgKwh" DOUBLE PRECISION NOT NULL,
    "annualKwh" DOUBLE PRECISION NOT NULL,
    "optimalTiltDeg" DOUBLE PRECISION,
    "optimalAzimuthDeg" DOUBLE PRECISION,
    "totalLossPct" DOUBLE PRECISION NOT NULL,
    "monthlyJson" JSONB NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'JRC_PVGIS_V5_3',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SolarAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SolarAnalysis_farmId_idx" ON "SolarAnalysis"("farmId");

-- PumpConfiguration table
CREATE TABLE "PumpConfiguration" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "flowRateM3Hr" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "staticHeadM" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "pipeLengthM" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "pipeDiameterMm" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "frictionLossM" DOUBLE PRECISION NOT NULL DEFAULT 4.2,
    "operatingPressureHeadM" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "totalDynamicHeadM" DOUBLE PRECISION NOT NULL DEFAULT 34.2,
    "pumpEfficiencyPct" DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    "motorEfficiencyPct" DOUBLE PRECISION NOT NULL DEFAULT 88.0,
    "operatingHoursDay" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PumpConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PumpConfiguration_farmId_key" ON "PumpConfiguration"("farmId");

-- IrrigationAnalysis table
CREATE TABLE "IrrigationAnalysis" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "cropCode" TEXT NOT NULL,
    "irrigatedAreaHa" DOUBLE PRECISION NOT NULL,
    "irrigationMethod" "IrrigationMethod" NOT NULL DEFAULT 'DRIP',
    "applicationEfficiencyPct" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "annualEtcMm" DOUBLE PRECISION NOT NULL,
    "annualEffectiveRainMm" DOUBLE PRECISION NOT NULL,
    "annualNetIrrigationMm" DOUBLE PRECISION NOT NULL,
    "peakDailyWaterM3" DOUBLE PRECISION NOT NULL,
    "annualGrossWaterM3" DOUBLE PRECISION NOT NULL,
    "hydraulicPowerKw" DOUBLE PRECISION NOT NULL,
    "electricalPowerKw" DOUBLE PRECISION NOT NULL,
    "dailyPumpEnergyKwh" DOUBLE PRECISION NOT NULL,
    "annualPumpEnergyKwh" DOUBLE PRECISION NOT NULL,
    "solarCoveragePct" DOUBLE PRECISION NOT NULL,
    "worstMonthCoveragePct" DOUBLE PRECISION NOT NULL,
    "scheduleJson" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IrrigationAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IrrigationAnalysis_farmId_idx" ON "IrrigationAnalysis"("farmId");

-- EnvironmentalAnalysis table
CREATE TABLE "EnvironmentalAnalysis" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "elevationM" DOUBLE PRECISION NOT NULL,
    "slopePct" DOUBLE PRECISION NOT NULL,
    "aridityIndex" DOUBLE PRECISION NOT NULL,
    "waporAetiMmYr" DOUBLE PRECISION,
    "waporRetMmYr" DOUBLE PRECISION,
    "waporPcpMmYr" DOUBLE PRECISION,
    "waporBiomassKgHa" DOUBLE PRECISION,
    "waporNbwpKgM3" DOUBLE PRECISION,
    "hydroBasinId" TEXT,
    "pfafstetterId" TEXT,
    "upstreamAreaKm2" DOUBLE PRECISION,
    "basinIrrigationGap" DOUBLE PRECISION,
    "alertsJson" JSONB,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnvironmentalAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnvironmentalAnalysis_farmId_idx" ON "EnvironmentalAnalysis"("farmId");

-- FeasibilityReport table
CREATE TABLE "FeasibilityReport" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "verdict" "FeasibilityVerdict" NOT NULL,
    "reportJson" JSONB NOT NULL,
    "sourcesJson" JSONB NOT NULL,
    "uncertaintiesJson" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'TERRAPULSE_ENGINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeasibilityReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeasibilityReport_farmId_idx" ON "FeasibilityReport"("farmId");

-- AIConversation & AIMessage tables
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "farmId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");
CREATE INDEX "AIConversation_farmId_idx" ON "AIConversation"("farmId");

CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCallsJson" JSONB,
    "citationsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- SyncOperation table
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "SyncAction" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "clientTimestamp" TIMESTAMP(3) NOT NULL,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SyncStatus" NOT NULL,
    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncOperation_operationId_key" ON "SyncOperation"("operationId");
CREATE INDEX "SyncOperation_userId_serverTimestamp_idx" ON "SyncOperation"("userId", "serverTimestamp");

-- Foreign keys
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmBoundary" ADD CONSTRAINT "FarmBoundary_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmLocation" ADD CONSTRAINT "FarmLocation_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoilProfile" ADD CONSTRAINT "SoilProfile_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaterSource" ADD CONSTRAINT "WaterSource_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeatherObservation" ADD CONSTRAINT "WeatherObservation_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolarConfiguration" ADD CONSTRAINT "SolarConfiguration_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolarAnalysis" ADD CONSTRAINT "SolarAnalysis_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolarAnalysis" ADD CONSTRAINT "SolarAnalysis_solarConfigId_fkey" FOREIGN KEY ("solarConfigId") REFERENCES "SolarConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PumpConfiguration" ADD CONSTRAINT "PumpConfiguration_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IrrigationAnalysis" ADD CONSTRAINT "IrrigationAnalysis_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnvironmentalAnalysis" ADD CONSTRAINT "EnvironmentalAnalysis_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeasibilityReport" ADD CONSTRAINT "FeasibilityReport_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
