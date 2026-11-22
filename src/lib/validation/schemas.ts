import { z } from "zod";

export const coordinatesSchema = z.object({
  latitude: z.coerce.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  longitude: z.coerce.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
});

export const polygonBoundarySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z
    .array(
      z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(4)
    )
    .min(1),
});

export const farmPinInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  role: z.enum([
    "FIELD_CENTER",
    "WELL_CANDIDATE",
    "SOLAR_ARRAY",
    "PUMP_INTAKE",
    "SOIL_SAMPLE",
    "CUSTOM",
  ]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevationM: z.number().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const solarConfigInputSchema = z.object({
  capacityKwp: z.coerce.number().min(0.2).max(5000),
  tiltDeg: z.coerce.number().min(0).max(90),
  azimuthDeg: z.coerce.number().min(-180).max(180),
  mountingType: z.enum(["free", "building"]).default("free"),
  systemLossPct: z.coerce.number().min(1).max(50).default(14),
  optimizeAngles: z.boolean().default(false),
});

export const pumpConfigInputSchema = z.object({
  flowRateM3Hr: z.coerce.number().min(0.1).max(2000),
  staticHeadM: z.coerce.number().min(0).max(500),
  pipeLengthM: z.coerce.number().min(1).max(20000),
  pipeDiameterMm: z.coerce.number().min(15).max(1000),
  pipeMaterialC: z.coerce.number().min(60).max(160).default(140),
  operatingPressureHeadM: z.coerce.number().min(0).max(120).default(15),
  pumpEfficiencyPct: z.coerce.number().min(10).max(95),
  motorEfficiencyPct: z.coerce.number().min(20).max(98).default(88),
  operatingHoursDay: z.coerce.number().min(0.5).max(24),
});

export const farmCropInputSchema = z.object({
  id: z.string().optional(),
  cropCode: z.string().min(1).max(60),
  cropName: z.string().min(1).max(120),
  cultivatedAreaHa: z.coerce.number().positive("Crop area must be > 0").max(100000),
  areaUnit: z.enum(["ha", "m2"]).default("ha"),
  plantingDate: z.string().max(40).nullable().optional(),
  growthStage: z.string().max(60).nullable().optional(),
  plotCount: z.coerce.number().int().min(1).max(1000).default(1),
  plantingDensity: z.string().max(80).nullable().optional(),
  irrigationMethod: z
    .enum(["DRIP", "SUBSURFACE_DRIP", "SPRINKLER", "CENTER_PIVOT", "FURROW", "MANUAL", "NONE", "OTHER"])
    .default("DRIP"),
});

export const farmerWaterSourceSchema = z.object({
  id: z.string().optional(),
  sourceType: z.enum([
    "WELL",
    "BOREHOLE",
    "RIVER",
    "LAKE",
    "RESERVOIR",
    "RAINWATER_COLLECTION",
    "PUBLIC_NETWORK",
    "OTHER",
    "UNKNOWN",
  ]),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  distanceMeters: z.coerce.number().min(0).max(100000).nullable().optional(),
  availability: z.string().max(100).nullable().optional(),
  wellDepthM: z.coerce.number().min(0).max(2000).nullable().optional(),
  flowRateM3Hr: z.coerce.number().min(0).max(5000).nullable().optional(),
  waterQualityNotes: z.string().max(300).nullable().optional(),
  isFarmerProvided: z.boolean().default(true),
});

export const createFarmSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(140),
  description: z.string().max(1000).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  region: z.string().max(120).nullable().optional(),
  governorate: z.string().max(100).nullable().optional(),
  delegation: z.string().max(100).nullable().optional(),
  locality: z.string().max(140).nullable().optional(),
  centerLat: z.coerce.number().min(-90).max(90),
  centerLon: z.coerce.number().min(-180).max(180),
  elevationM: z.coerce.number().nullable().optional(),
  areaHectares: z.coerce.number().min(0.01).max(100000).optional(),
  perimeterMeters: z.coerce.number().min(1).max(1000000).optional(),
  boundary: polygonBoundarySchema.nullable().optional(),
  boundaryVerified: z.boolean().optional(),
  pins: z.array(farmPinInputSchema).optional(),
  crops: z.array(farmCropInputSchema).optional(),
  allowCropOverlap: z.boolean().optional(),
  farmerWaterSources: z.array(farmerWaterSourceSchema).optional(),
  solarConfig: solarConfigInputSchema
    .partial()
    .extend({
      solarStatus: z.enum(["YES", "NO", "PLANNING", "NOT_SURE"]).optional(),
      panelCount: z.number().nullable().optional(),
      panelWattageW: z.number().nullable().optional(),
      hasBattery: z.boolean().optional(),
      batteryCapacityKwh: z.number().nullable().optional(),
      hasGridConnection: z.boolean().optional(),
      isFarmerProvided: z.boolean().optional(),
    })
    .optional(),
  pumpConfig: pumpConfigInputSchema
    .partial()
    .extend({
      hasPump: z.boolean().optional(),
      pumpType: z.string().nullable().optional(),
      powerKw: z.number().nullable().optional(),
      isFarmerProvided: z.boolean().optional(),
    })
    .optional(),
  primaryCropCode: z.string().min(1).max(40).default("tomato"),
  plantingMonth: z.coerce.number().int().min(1).max(12).default(3),
  soilTexture: z
    .enum(["SANDY", "SANDY_LOAM", "LOAM", "SILT_LOAM", "CLAY_LOAM", "CLAY"])
    .default("LOAM"),
  irrigationMethod: z
    .enum([
      "DRIP",
      "SUBSURFACE_DRIP",
      "SPRINKLER",
      "CENTER_PIVOT",
      "FURROW",
      "MANUAL",
      "NONE",
      "OTHER",
    ])
    .default("DRIP"),
});

export const syncOperationRequestSchema = z.object({
  operations: z
    .array(
      z.object({
        operationId: z.string().min(4).max(128),
        entityType: z.enum(["FARM", "PIN", "BOUNDARY", "CONFIG", "REPORT", "ONBOARDING"]),
        entityId: z.string().min(1).max(128),
        action: z.enum(["CREATE", "UPDATE", "DELETE"]),
        payload: z.unknown(),
        clientTimestamp: z.string().datetime(),
      })
    )
    .max(100),
});

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const registerRequestSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(80),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: strongPasswordSchema,
});

export const emailLoginRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(4, "Reset code is required"),
  newPassword: strongPasswordSchema,
});

export const farmerProfileStageSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z.string().trim().max(40).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  country: z.string().trim().min(2).max(80).default("Tunisia"),
  governorate: z.string().trim().max(80).nullable().optional(),
  delegation: z.string().trim().max(80).nullable().optional(),
  locality: z.string().trim().max(120).nullable().optional(),
  preferredLanguage: z.enum(["en", "fr", "ar"]).default("en"),
  preferredUnits: z.enum(["metric", "sqm"]).default("metric"),
  experienceLevel: z.enum([
    "BEGINNER",
    "LESS_THAN_2_YEARS",
    "YEARS_2_5",
    "YEARS_5_10",
    "MORE_THAN_10_YEARS",
  ]),
  activityType: z.enum([
    "SMALL_FAMILY_FARM",
    "COMMERCIAL_AGRICULTURE",
    "AGRICULTURAL_COOPERATIVE",
    "AGRICULTURAL_LANDOWNER",
    "OTHER",
  ]),
});

export const aiChatRequestSchema = z.object({
  farmId: z.string().optional(),
  compareFarmId: z.string().optional(),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .optional(),
  groqApiKeyOverride: z.string().max(256).optional(),
  groqModelOverride: z.string().max(128).optional(),
});

export const createSensorDeviceSchema = z.object({
  name: z.string().trim().min(1, "Sensor name is required").max(80).default("Field sensor"),
});

export const singleSensorReadingInputSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    ageSeconds: z.number().min(0).max(7 * 86400).optional(),
    airTempC: z.number().finite().min(-40).max(85).nullable().optional(),
    airHumidityPct: z.number().finite().min(0).max(100).nullable().optional(),
    soilMoisturePct: z.number().finite().min(0).max(100).nullable().optional(),
    soilRaw: z.number().int().min(0).max(4095).nullable().optional(),
    waterLevelPct: z.number().finite().min(0).max(100).nullable().optional(),
    waterRaw: z.number().int().min(0).max(4095).nullable().optional(),
    pumpOn: z.boolean().optional(),
    soilFault: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const hasMetric =
      val.airTempC !== undefined ||
      val.airHumidityPct !== undefined ||
      val.soilMoisturePct !== undefined ||
      val.soilRaw !== undefined ||
      val.waterLevelPct !== undefined ||
      val.waterRaw !== undefined ||
      val.pumpOn !== undefined ||
      val.soilFault !== undefined;
    if (!hasMetric) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one sensor measurement must be provided",
      });
    }
  })
  .transform((val) => {
    const isSoilFault = Boolean(
      val.soilFault || (val.soilRaw !== null && val.soilRaw !== undefined && val.soilRaw >= 4000)
    );
    return {
      ...val,
      pumpOn: Boolean(val.pumpOn),
      soilFault: isSoilFault,
      soilMoisturePct: isSoilFault ? null : (val.soilMoisturePct ?? null),
    };
  });

export const sensorReadingsPayloadSchema = z
  .union([
    singleSensorReadingInputSchema.transform((item) => [item]),
    z
      .array(singleSensorReadingInputSchema)
      .min(1, "At least one reading is required")
      .max(50, "Cannot accept more than 50 readings per batch"),
    z.object({
      readings: z
        .array(singleSensorReadingInputSchema)
        .min(1, "At least one reading is required")
        .max(50, "Cannot accept more than 50 readings per batch"),
    }).transform((obj) => obj.readings),
  ]);

// ---------------------------------------------------------------------------
// FarmBrain & Decision Simulator Schemas
// ---------------------------------------------------------------------------

export const farmBrainAnalyzeSchema = z.object({
  farmId: z.string().min(1, "farmId is required"),
  waterTariffTndPerM3: z.coerce.number().min(0).max(50).nullable().optional(),
  electricityTariffTndPerKwh: z.coerce.number().min(0).max(10).nullable().optional(),
});

export const simulationScenarioTypeEnum = z.enum([
  "WATER_SHORTAGE",
  "CHANGE_CROP",
  "WEATHER_CLIMATE",
  "IRRIGATION_STRATEGY",
  "FARM_EXPANSION",
]);

export const simulationInputsSchema = z.object({
  scenarioType: simulationScenarioTypeEnum,
  availableWaterLitres: z.coerce.number().min(0).max(50_000_000).optional(),
  targetPlotId: z.string().max(120).optional(),
  newCropCode: z.string().min(1).max(60).optional(),
  tempDeltaC: z.coerce.number().min(-10).max(12).optional(),
  rainChangePct: z.coerce.number().min(-100).max(300).optional(),
  humidityDeltaPct: z.coerce.number().min(-40).max(40).optional(),
  horizonDays: z.coerce.number().int().min(7).max(365).optional(),
  strategy: z
    .enum(["CURRENT", "DAILY", "EVERY_2_DAYS", "MOISTURE_TRIGGER", "AI_OPTIMIZED"])
    .optional(),
  moistureThresholdPct: z.coerce.number().min(10).max(90).optional(),
  addedAreaHa: z.coerce.number().min(0.05).max(500).optional(),
  addedCropCode: z.string().min(1).max(60).optional(),
  addedIrrigationMethod: z
    .enum([
      "DRIP",
      "SUBSURFACE_DRIP",
      "SPRINKLER",
      "CENTER_PIVOT",
      "FURROW",
      "MANUAL",
      "NONE",
      "OTHER",
    ])
    .optional(),
  waterTariffTndPerM3: z.coerce.number().min(0).max(50).nullable().optional(),
  electricityTariffTndPerKwh: z.coerce.number().min(0).max(10).nullable().optional(),
});

export const createSimulationScenarioSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().trim().min(1).max(140),
  inputs: simulationInputsSchema,
  runImmediately: z.boolean().default(true),
});

export const updateSimulationScenarioSchema = z.object({
  name: z.string().trim().min(1).max(140).optional(),
  inputs: simulationInputsSchema.optional(),
  isArchived: z.boolean().optional(),
});

export const compareScenariosSchema = z.object({
  farmId: z.string().min(1),
  scenarioIds: z.array(z.string().min(1)).min(2).max(10),
});

export const predictSoilMoistureSchema = z.object({
  farmId: z.string().optional(),
  initialMoisturePct: z.coerce.number().min(0).max(100).default(50),
  kc: z.coerce.number().min(0.2).max(1.5).default(0.9),
  tawMmM: z.coerce.number().min(50).max(320).default(160),
  infiltrationMmHr: z.coerce.number().min(1).max(100).default(16),
});

export const predictWaterDemandSchema = z.object({
  soilMoisturePct: z.coerce.number().min(0).max(100),
  tempMaxC: z.coerce.number().min(-15).max(60),
  humidityPct: z.coerce.number().min(0).max(100),
  rainMm: z.coerce.number().min(0).max(500).default(0),
  et0Mm: z.coerce.number().min(0).max(20),
  kc: z.coerce.number().min(0.2).max(1.5).default(0.9),
  tawMmM: z.coerce.number().min(50).max(320).default(160),
  dayOfYear: z.coerce.number().int().min(1).max(366).default(165),
});

export const optimizeWaterAllocationSchema = z.object({
  availableLitres: z.coerce.number().min(0).max(100_000_000),
  plots: z
    .array(
      z.object({
        plotId: z.string().min(1),
        cropCode: z.string().min(1),
        cropName: z.string().min(1),
        areaHa: z.coerce.number().positive(),
        growthStage: z.string().default("MID"),
        dailyNeedLitres: z.coerce.number().min(0),
        priorityWeight: z.coerce.number().positive(),
        ky: z.coerce.number().positive().default(1.0),
      })
    )
    .min(1),
});

export const simulateCropGrowthSchema = z.object({
  cropCode: z.string().min(1),
  dailyEt0Mm: z.array(z.coerce.number().min(0).max(25)).min(7).max(366),
  dailyRainMm: z.array(z.coerce.number().min(0).max(300)).min(7).max(366),
  dailyIrrigationMm: z.array(z.coerce.number().min(0).max(200)).optional(),
  tawMmM: z.coerce.number().min(50).max(320).default(160),
});
