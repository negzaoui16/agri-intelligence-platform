import type { SoilProfileData, SoilTextureClass } from "@/types/agri";

export const SOIL_TEXTURE_DEFAULTS: Record<
  SoilTextureClass,
  Omit<SoilProfileData, "source" | "updatedAt">
> = {
  SANDY: {
    textureClass: "SANDY",
    fieldCapacityMmM: 120,
    wiltingPointMmM: 50,
    tawMmM: 70,
    infiltrationRateMmHr: 45,
    organicMatterPct: 0.8,
    ph: 6.8,
  },
  SANDY_LOAM: {
    textureClass: "SANDY_LOAM",
    fieldCapacityMmM: 190,
    wiltingPointMmM: 80,
    tawMmM: 110,
    infiltrationRateMmHr: 25,
    organicMatterPct: 1.5,
    ph: 6.9,
  },
  LOAM: {
    textureClass: "LOAM",
    fieldCapacityMmM: 270,
    wiltingPointMmM: 120,
    tawMmM: 150,
    infiltrationRateMmHr: 15,
    organicMatterPct: 2.4,
    ph: 7.0,
  },
  SILT_LOAM: {
    textureClass: "SILT_LOAM",
    fieldCapacityMmM: 310,
    wiltingPointMmM: 135,
    tawMmM: 175,
    infiltrationRateMmHr: 10,
    organicMatterPct: 2.6,
    ph: 7.1,
  },
  CLAY_LOAM: {
    textureClass: "CLAY_LOAM",
    fieldCapacityMmM: 340,
    wiltingPointMmM: 175,
    tawMmM: 165,
    infiltrationRateMmHr: 6,
    organicMatterPct: 2.8,
    ph: 7.3,
  },
  CLAY: {
    textureClass: "CLAY",
    fieldCapacityMmM: 380,
    wiltingPointMmM: 230,
    tawMmM: 150,
    infiltrationRateMmHr: 3,
    organicMatterPct: 3.1,
    ph: 7.4,
  },
};

export const IRRIGATION_EFFICIENCY_DEFAULTS: Record<
  "DRIP" | "SUBSURFACE_DRIP" | "SPRINKLER" | "CENTER_PIVOT" | "FURROW",
  { efficiencyPct: number; typicalPressureHeadM: number; label: string }
> = {
  DRIP: { efficiencyPct: 90, typicalPressureHeadM: 15, label: "Surface Drip" },
  SUBSURFACE_DRIP: { efficiencyPct: 94, typicalPressureHeadM: 16, label: "Subsurface Drip" },
  SPRINKLER: { efficiencyPct: 75, typicalPressureHeadM: 30, label: "Solid-Set Sprinkler" },
  CENTER_PIVOT: { efficiencyPct: 82, typicalPressureHeadM: 25, label: "Center Pivot" },
  FURROW: { efficiencyPct: 60, typicalPressureHeadM: 4, label: "Gravity Furrow" },
};
