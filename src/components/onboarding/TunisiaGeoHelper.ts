export interface GovernorateCoord {
  name: string;
  lat: number;
  lon: number;
}

export const TUNISIA_GOVERNORATE_COORDS: GovernorateCoord[] = [
  { name: "Tunis", lat: 36.8065, lon: 10.1815 },
  { name: "Ariana", lat: 36.8665, lon: 10.1647 },
  { name: "Ben Arous", lat: 36.7531, lon: 10.2189 },
  { name: "Manouba", lat: 36.808, lon: 10.0972 },
  { name: "Nabeul", lat: 36.4561, lon: 10.7376 },
  { name: "Zaghouan", lat: 36.4029, lon: 10.1429 },
  { name: "Bizerte", lat: 37.2746, lon: 9.8739 },
  { name: "Beja", lat: 36.7256, lon: 9.1817 },
  { name: "Jendouba", lat: 36.5011, lon: 8.7802 },
  { name: "Kef", lat: 36.1742, lon: 8.7049 },
  { name: "Siliana", lat: 36.0849, lon: 9.3708 },
  { name: "Sousse", lat: 35.8256, lon: 10.6084 },
  { name: "Monastir", lat: 35.7643, lon: 10.8113 },
  { name: "Mahdia", lat: 35.5047, lon: 11.0622 },
  { name: "Sfax", lat: 34.7406, lon: 10.7603 },
  { name: "Kairouan", lat: 35.6781, lon: 10.0963 },
  { name: "Kasserine", lat: 35.1676, lon: 8.8365 },
  { name: "Sidi Bouzid", lat: 35.0382, lon: 9.4849 },
  { name: "Gabes", lat: 33.8815, lon: 10.0982 },
  { name: "Medenine", lat: 33.3549, lon: 10.5055 },
  { name: "Tataouine", lat: 32.9297, lon: 10.4518 },
  { name: "Gafsa", lat: 34.425, lon: 8.7842 },
  { name: "Tozeur", lat: 33.9197, lon: 8.1335 },
  { name: "Kebili", lat: 33.7044, lon: 8.969 },
];

export const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "LESS_THAN_2_YEARS", label: "Less than 2 years" },
  { value: "YEARS_2_5", label: "2–5 years" },
  { value: "YEARS_5_10", label: "5–10 years" },
  { value: "MORE_THAN_10_YEARS", label: "More than 10 years" },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: "SMALL_FAMILY_FARM", label: "Small family farm" },
  { value: "COMMERCIAL_AGRICULTURE", label: "Commercial agriculture" },
  { value: "AGRICULTURAL_COOPERATIVE", label: "Agricultural cooperative" },
  { value: "AGRICULTURAL_LANDOWNER", label: "Agricultural landowner" },
  { value: "OTHER", label: "Other" },
] as const;

export const WATER_SOURCE_OPTIONS = [
  { value: "WELL", label: "Shallow Well" },
  { value: "BOREHOLE", label: "Deep Borehole" },
  { value: "RIVER", label: "River / Oued" },
  { value: "LAKE", label: "Lake / Pond" },
  { value: "RESERVOIR", label: "Dam / Reservoir" },
  { value: "RAINWATER_COLLECTION", label: "Rainwater Collection" },
  { value: "PUBLIC_NETWORK", label: "Public Water Network" },
  { value: "OTHER", label: "Other Source" },
  { value: "UNKNOWN", label: "Unknown / Not yet available" },
] as const;

export const IRRIGATION_SYSTEM_OPTIONS = [
  { value: "DRIP", label: "Drip irrigation" },
  { value: "SPRINKLER", label: "Sprinkler irrigation" },
  { value: "FURROW", label: "Surface irrigation" },
  { value: "MANUAL", label: "Manual irrigation" },
  { value: "NONE", label: "No irrigation" },
  { value: "OTHER", label: "Other" },
] as const;
