"use client";

import * as React from "react";
import * as turf from "@turf/turf";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type {
  FarmPin,
  FarmRecord,
  GeoPolygon,
  PinRole,
  WaterSourceFeature,
} from "@/types/agri";
import {
  Check,
  Crosshair,
  Droplets,
  Layers,
  MapPin,
  PenTool,
  RotateCcw,
  Trash2,
} from "lucide-react";

export type BaseLayerId = "osm" | "satellite" | "topo";

interface InteractiveFarmMapProps {
  centerLat: number;
  centerLon: number;
  boundary: GeoPolygon | null;
  pins: FarmPin[];
  waterSources?: WaterSourceFeature[];
  farms?: FarmRecord[];
  activeFarmId?: string | null;
  mode: "INSPECT" | "DROP_PIN" | "DRAW_BOUNDARY";
  activePinRole: PinRole;
  showWaterOverlay: boolean;
  showWeatherOverlay: boolean;
  baseLayer: BaseLayerId;
  onModeChange: (mode: "INSPECT" | "DROP_PIN" | "DRAW_BOUNDARY") => void;
  onBaseLayerChange: (layer: BaseLayerId) => void;
  onSelectFarm?: (farmId: string) => void;
  onAddPin: (lat: number, lon: number, role: PinRole) => void;
  onBoundaryChange: (
    boundary: GeoPolygon | null,
    areaHa: number,
    perimeterM: number
  ) => void;
  onCoordinateInspect?: (lat: number, lon: number) => void;
}

function buildMapStyle(layer: BaseLayerId, showWeatherOverlay: boolean): maplibregl.StyleSpecification {
  const sources: maplibregl.StyleSpecification["sources"] = {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri World Imagery",
    },
    topo: {
      type: "raster",
      tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenTopoMap (CC-BY-SA)",
    },
  };

  const layers: maplibregl.LayerSpecification[] = [
    {
      id: "base-raster",
      type: "raster",
      source: layer,
      minzoom: 0,
      maxzoom: 19,
    },
  ];

  if (showWeatherOverlay) {
    sources.rainviewer = {
      type: "raster",
      tiles: [
        "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "Iowa Mesonet Radar Overlay",
    };
    layers.push({
      id: "weather-radar",
      type: "raster",
      source: "rainviewer",
      paint: { "raster-opacity": 0.45 },
    });
  }

  return {
    version: 8,
    sources,
    layers,
  };
}

export function InteractiveFarmMap(props: InteractiveFarmMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<maplibregl.Marker[]>([]);
  const [draftVertices, setDraftVertices] = React.useState<[number, number][]>([]);
  const [webglError, setWebglError] = React.useState(false);
  const [mapReady, setMapReady] = React.useState(false);

  const propsRef = React.useRef(props);
  propsRef.current = props;
  const draftRef = React.useRef(draftVertices);
  draftRef.current = draftVertices;

  const commitDraftPolygon = React.useCallback(
    (verts: [number, number][]) => {
      if (verts.length < 3) return;
      const ring = [...verts, verts[0]];
      const polygon: GeoPolygon = {
        type: "Polygon",
        coordinates: [ring],
      };
      const turfPoly = turf.polygon([ring]);
      const areaHa = Number((turf.area(turfPoly) / 10_000).toFixed(4));
      const line = turf.polygonToLine(turfPoly);
      const perimeterM = Number(
        (
          (line.type === "FeatureCollection"
            ? line.features.reduce((s, f) => s + turf.length(f, { units: "kilometers" }), 0)
            : turf.length(line, { units: "kilometers" })) * 1000
        ).toFixed(1)
      );
      propsRef.current.onBoundaryChange(polygon, areaHa, perimeterM);
      setDraftVertices([]);
      propsRef.current.onModeChange("INSPECT");
    },
    []
  );

  // Initialize MapLibre GL map
  React.useEffect(() => {
    if (!containerRef.current) return;

    // Detect WebGL capability gracefully
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl2") ||
        testCanvas.getContext("webgl") ||
        testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglError(true);
        return;
      }
    } catch {
      setWebglError(true);
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildMapStyle(props.baseLayer, props.showWeatherOverlay),
        center: [props.centerLon, props.centerLat],
        zoom: 14.2,
        attributionControl: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      const cur = propsRef.current;
      if (cur.mode === "DROP_PIN") {
        cur.onAddPin(Number(lat.toFixed(6)), Number(lng.toFixed(6)), cur.activePinRole);
      } else if (cur.mode === "DRAW_BOUNDARY") {
        setDraftVertices((prev) => [...prev, [Number(lng.toFixed(6)), Number(lat.toFixed(6))]]);
      } else if (cur.onCoordinateInspect) {
        cur.onCoordinateInspect(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      }
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when active farm changes
  React.useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [props.centerLon, props.centerLat],
      zoom: 14.2,
      duration: 700,
    });
  }, [props.centerLat, props.centerLon, props.activeFarmId]);

  // Switch base layer or weather overlay
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setMapReady(false);
    map.setStyle(buildMapStyle(props.baseLayer, props.showWeatherOverlay));
    map.once("style.load", () => setMapReady(true));
  }, [props.baseLayer, props.showWeatherOverlay]);

  // Render polygons, draft line, water vectors & markers
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const polyGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    if (props.farms && props.farms.length > 0) {
      for (const f of props.farms) {
        if (f.boundary && f.id !== props.activeFarmId) {
          polyGeoJson.features.push({
            type: "Feature",
            properties: { id: f.id, active: false, name: f.name },
            geometry: f.boundary,
          });
        }
      }
    }
    if (props.boundary) {
      polyGeoJson.features.push({
        type: "Feature",
        properties: { id: props.activeFarmId || "active", active: true },
        geometry: props.boundary,
      });
    }

    const draftGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features:
        draftVertices.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates:
                    draftVertices.length >= 3
                      ? [...draftVertices, draftVertices[0]]
                      : draftVertices,
                },
              },
            ]
          : [],
    };

    const waterVectorGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features:
        props.showWaterOverlay && props.waterSources && props.waterSources.length > 0
          ? props.waterSources.slice(0, 6).map((ws) => ({
              type: "Feature" as const,
              properties: { name: ws.name, dist: ws.distanceFromCentroidM },
              geometry: {
                type: "LineString" as const,
                coordinates: [
                  [props.centerLon, props.centerLat],
                  [ws.longitude, ws.latitude],
                ],
              },
            }))
          : [],
    };

    const upsertGeoJsonSource = (id: string, data: GeoJSON.FeatureCollection) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(data);
      } else {
        map.addSource(id, { type: "geojson", data });
      }
    };

    upsertGeoJsonSource("farm-polygons", polyGeoJson);
    if (!map.getLayer("farm-polygons-fill")) {
      map.addLayer({
        id: "farm-polygons-fill",
        type: "fill",
        source: "farm-polygons",
        paint: {
          "fill-color": ["case", ["get", "active"], "#16a34a", "#64748b"],
          "fill-opacity": ["case", ["get", "active"], 0.25, 0.14],
        },
      });
      map.addLayer({
        id: "farm-polygons-line",
        type: "line",
        source: "farm-polygons",
        paint: {
          "line-color": ["case", ["get", "active"], "#14532d", "#475569"],
          "line-width": ["case", ["get", "active"], 3, 1.5],
        },
      });
      map.on("click", "farm-polygons-fill", (e) => {
        const fid = e.features?.[0]?.properties?.id;
        if (fid && propsRef.current.mode === "INSPECT" && propsRef.current.onSelectFarm) {
          propsRef.current.onSelectFarm(String(fid));
        }
      });
    }

    upsertGeoJsonSource("draft-boundary", draftGeoJson);
    if (!map.getLayer("draft-boundary-line")) {
      map.addLayer({
        id: "draft-boundary-line",
        type: "line",
        source: "draft-boundary",
        paint: {
          "line-color": "#d97706",
          "line-width": 2.5,
          "line-dasharray": [2, 1.5],
        },
      });
    }

    upsertGeoJsonSource("water-vectors", waterVectorGeoJson);
    if (!map.getLayer("water-vectors-line")) {
      map.addLayer({
        id: "water-vectors-line",
        type: "line",
        source: "water-vectors",
        paint: {
          "line-color": "#0284c7",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });
    }

    // Update HTML Markers for pins, draft vertices & water sources
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const pin of props.pins) {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center";
      const color =
        pin.role === "SOLAR_ARRAY"
          ? "#d97706"
          : pin.role === "PUMP_INTAKE" || pin.role === "WELL_CANDIDATE"
          ? "#0284c7"
          : "#14532d";
      el.innerHTML = `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer" title="${pin.label}"></div>`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 14 }).setHTML(
            `<div style="font-size:12px;color:#111"><strong>${pin.label}</strong><br/><span>${pin.role.replace("_", " ")}</span><br/><span>${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}</span></div>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Draggable boundary vertices when a boundary exists
    if (props.boundary?.coordinates?.[0]) {
      const ring = props.boundary.coordinates[0];
      for (let idx = 0; idx < ring.length - 1; idx++) {
        const coord = ring[idx];
        const vEl = document.createElement("div");
        vEl.style.cssText =
          "width:12px;height:12px;border-radius:3px;background:#ffffff;border:2px solid #14532d;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,0.3);";
        const vMarker = new maplibregl.Marker({ element: vEl, draggable: true })
          .setLngLat([coord[0], coord[1]])
          .addTo(map);
        vMarker.on("dragend", () => {
          const pos = vMarker.getLngLat();
          const nextRing = ring.map((c, i) =>
            i === idx ? [Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))] : c
          );
          if (idx === 0) {
            nextRing[nextRing.length - 1] = nextRing[0];
          }
          const nextPoly: GeoPolygon = { type: "Polygon", coordinates: [nextRing] };
          const tp = turf.polygon([nextRing]);
          const areaHa = Number((turf.area(tp) / 10_000).toFixed(4));
          const ln = turf.polygonToLine(tp);
          const perim = Number(
            (
              (ln.type === "FeatureCollection"
                ? ln.features.reduce((s, f) => s + turf.length(f, { units: "kilometers" }), 0)
                : turf.length(ln, { units: "kilometers" })) * 1000
            ).toFixed(1)
          );
          propsRef.current.onBoundaryChange(nextPoly, areaHa, perim);
        });
        markersRef.current.push(vMarker);
      }
    }

    // Draft drawing vertices
    for (const pt of draftVertices) {
      const dEl = document.createElement("div");
      dEl.style.cssText =
        "width:12px;height:12px;border-radius:9999px;background:#d97706;border:2px solid #fff;";
      markersRef.current.push(new maplibregl.Marker({ element: dEl }).setLngLat(pt).addTo(map));
    }

    // Water source markers
    if (props.showWaterOverlay && props.waterSources) {
      for (const ws of props.waterSources.slice(0, 20)) {
        const wEl = document.createElement("div");
        wEl.style.cssText =
          "width:14px;height:14px;border-radius:9999px;background:#0284c7;border:2px solid #e0f2fe;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;";
        const wm = new maplibregl.Marker({ element: wEl })
          .setLngLat([ws.longitude, ws.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div style="font-size:12px;color:#111"><strong>${ws.name}</strong><br/>Type: ${ws.sourceType}<br/>Distance: ${ws.distanceFromCentroidM} m<br/>Elev Diff: ${ws.elevationDiffFromFarmM ?? "N/A"} m<br/><em>Unverified availability</em></div>`
            )
          )
          .addTo(map);
      markersRef.current.push(wm);
      }
    }
  }, [
    mapReady,
    props.boundary,
    props.pins,
    props.waterSources,
    props.farms,
    props.activeFarmId,
    props.showWaterOverlay,
    props.centerLat,
    props.centerLon,
    draftVertices,
  ]);

  const handleLocateGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15 });
        props.onCoordinateInspect?.(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] rounded-xl overflow-hidden border border-border bg-muted">
      {webglError ? (
        /* Graceful Interactive 2D Coordinate Canvas Fallback if WebGL context is unavailable */
        <div
          className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-emerald-950/10"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width - 0.5;
            const ny = 0.5 - (e.clientY - rect.top) / rect.height;
            const lat = Number((props.centerLat + ny * 0.02).toFixed(6));
            const lon = Number((props.centerLon + nx * 0.02).toFixed(6));
            if (props.mode === "DROP_PIN") {
              props.onAddPin(lat, lon, props.activePinRole);
            } else if (props.mode === "DRAW_BOUNDARY") {
              setDraftVertices((prev) => [...prev, [lon, lat]]);
            } else {
              props.onCoordinateInspect?.(lat, lon);
            }
          }}
        >
          <p className="text-sm font-semibold mb-1">
            Interactive 2D Coordinate Grid (WebGL Fallback Mode)
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Center: {props.centerLat.toFixed(5)}°, {props.centerLon.toFixed(5)}° • Click anywhere on canvas to {props.mode === "DROP_PIN" ? "drop a pin" : props.mode === "DRAW_BOUNDARY" ? "add boundary vertex" : "inspect coordinates"}.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {props.pins.map((p) => (
              <Badge key={p.id} variant="green">
                {p.label} ({p.latitude.toFixed(4)}, {p.longitude.toFixed(4)})
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}

      {/* Top-Left Map Mode Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-60px)]">
        <Button
          size="sm"
          variant={props.mode === "INSPECT" ? "primary" : "secondary"}
          onClick={() => props.onModeChange("INSPECT")}
          title="Pan and inspect coordinates"
        >
          <Crosshair className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inspect</span>
        </Button>
        <Button
          size="sm"
          variant={props.mode === "DROP_PIN" ? "primary" : "secondary"}
          onClick={() => props.onModeChange("DROP_PIN")}
          title="Tap map to drop GPS pin"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Drop Pin</span>
        </Button>
        <Button
          size="sm"
          variant={props.mode === "DRAW_BOUNDARY" ? "primary" : "secondary"}
          onClick={() => {
            setDraftVertices([]);
            props.onModeChange("DRAW_BOUNDARY");
          }}
          title="Tap corners to draw field boundary"
        >
          <PenTool className="h-3.5 w-3.5" />
          <span>Draw Boundary</span>
        </Button>
        <Button size="sm" variant="secondary" onClick={handleLocateGps} title="Use Device GPS">
          <Crosshair className="h-3.5 w-3.5 text-sky-600" />
          <span className="hidden sm:inline">GPS</span>
        </Button>
      </div>

      {/* Bottom-Right Layer Switcher */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-card/95 border border-border rounded-lg p-1 shadow-sm">
        <Layers className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-1" />
        {(["osm", "satellite", "topo"] as BaseLayerId[]).map((id) => (
          <button
            key={id}
            onClick={() => props.onBaseLayerChange(id)}
            className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              props.baseLayer === id
                ? "bg-[var(--tp-bg-14532D)] text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {id === "osm" ? "Street" : id === "satellite" ? "Satellite" : "Terrain"}
          </button>
        ))}
      </div>

      {/* Boundary Drawing Action Bar */}
      {props.mode === "DRAW_BOUNDARY" && (
        <Card className="absolute bottom-14 left-3 z-10 p-2.5 flex flex-wrap items-center gap-2 bg-card/95 backdrop-blur-xs">
          <span className="text-xs font-medium">
            Drawing Boundary: {draftVertices.length} point(s)
          </span>
          {draftVertices.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraftVertices((v) => v.slice(0, -1))}
            >
              <RotateCcw className="h-3 w-3" />
              Undo
            </Button>
          )}
          {draftVertices.length >= 3 && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => commitDraftPolygon(draftVertices)}
            >
              <Check className="h-3 w-3" />
              Finish Polygon
            </Button>
          )}
        </Card>
      )}

      {props.boundary && props.mode !== "DRAW_BOUNDARY" && (
        <div className="absolute bottom-3 left-28 z-10 hidden sm:flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => props.onBoundaryChange(null, 1, 400)}
            title="Delete current field boundary"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
            Clear Boundary
          </Button>
        </div>
      )}

      {/* Water Legend Pill */}
      {props.showWaterOverlay && (
        <div className="hidden md:flex absolute top-3 right-14 z-10 bg-card/90 border border-border rounded-lg px-2.5 py-1 text-[11px] items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-sky-600" />
          <span>{props.waterSources?.length ?? 0} mapped water features</span>
        </div>
      )}
    </div>
  );
}
