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

export const createFarmSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(140),
  description: z.string().max(1000).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  region: z.string().max(120).nullable().optional(),
  centerLat: z.coerce.number().min(-90).max(90),
  centerLon: z.coerce.number().min(-180).max(180),
  elevationM: z.coerce.number().nullable().optional(),
  areaHectares: z.coerce.number().min(0.01).max(100000).optional(),
  perimeterMeters: z.coerce.number().min(1).max(1000000).optional(),
  boundary: polygonBoundarySchema.nullable().optional(),
  pins: z.array(farmPinInputSchema).optional(),
  primaryCropCode: z.string().min(1).max(40).default("tomato"),
  plantingMonth: z.coerce.number().int().min(1).max(12).default(3),
  soilTexture: z
    .enum(["SANDY", "SANDY_LOAM", "LOAM", "SILT_LOAM", "CLAY_LOAM", "CLAY"])
    .default("LOAM"),
  irrigationMethod: z
    .enum(["DRIP", "SUBSURFACE_DRIP", "SPRINKLER", "CENTER_PIVOT", "FURROW"])
    .default("DRIP"),
});

export const syncOperationRequestSchema = z.object({
  operations: z
    .array(
      z.object({
        operationId: z.string().min(4).max(128),
        entityType: z.enum(["FARM", "PIN", "BOUNDARY", "CONFIG", "REPORT"]),
        entityId: z.string().min(1).max(128),
        action: z.enum(["CREATE", "UPDATE", "DELETE"]),
        payload: z.unknown(),
        clientTimestamp: z.string().datetime(),
      })
    )
    .max(100),
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
