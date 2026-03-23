"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Loader2,
  Mountain,
  Compass,
  GraduationCap,
  HeartPulse,
  ShoppingCart,
  Bus,
  TreePine,
  Landmark,
} from "lucide-react";
import {
  geocodeCEP,
  fetchElevationGrid,
  computeSlope,
  fetchNearbyPOIs,
  type GeoPoint,
  type SlopeAnalysis,
  type POI,
} from "@/lib/terrain-elevation";

interface TerrainMapProps {
  cep: string;
  frontMeters: number;
  backMeters: number;
  leftMeters: number;
  rightMeters: number;
}

const CATEGORY_META: Record<
  POI["category"],
  {
    label: string;
    color: string;
    icon: typeof GraduationCap;
  }
> = {
  education: { label: "Educacao", color: "text-blue-600", icon: GraduationCap },
  health: { label: "Saude", color: "text-red-600", icon: HeartPulse },
  food: { label: "Alimentacao", color: "text-green-600", icon: ShoppingCart },
  transport: { label: "Transporte", color: "text-amber-600", icon: Bus },
  recreation: { label: "Lazer", color: "text-emerald-600", icon: TreePine },
  finance: { label: "Financas", color: "text-purple-600", icon: Landmark },
};

function SlopeClassBadge({ slopeClass }: { slopeClass: string }) {
  const colors: Record<string, string> = {
    plano: "bg-green-100 text-green-700",
    suave: "bg-blue-100 text-blue-700",
    moderado: "bg-amber-100 text-amber-700",
    forte: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[slopeClass] ?? "bg-gray-100 text-gray-700"}`}>
      {slopeClass}
    </span>
  );
}

export function TerrainMap({
  cep,
  frontMeters,
  backMeters,
  leftMeters,
  rightMeters,
}: TerrainMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [loading, setLoading] = useState(false);
  const [geoPoint, setGeoPoint] = useState<GeoPoint | null>(null);
  const [slope, setSlope] = useState<SlopeAnalysis | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lotWidth = Math.max(frontMeters, backMeters) || 10;
  const lotDepth = Math.max(leftMeters, rightMeters) || 20;

  const loadTerrainData = useCallback(async () => {
    if (!cep || cep.replace(/\D/g, "").length < 8) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Geocode
      const geo = await geocodeCEP(cep);
      if (!geo) {
        setError("Nao foi possivel localizar o CEP.");
        setLoading(false);
        return;
      }
      setGeoPoint(geo);

      // Step 2: Fetch elevation + POIs in parallel
      const [elevGrid, nearbyPois] = await Promise.all([
        fetchElevationGrid(geo.lat, geo.lng, lotWidth, lotDepth, 5),
        fetchNearbyPOIs(geo.lat, geo.lng, 1000),
      ]);

      if (elevGrid) {
        const slopeResult = computeSlope(elevGrid, lotWidth, lotDepth);
        setSlope(slopeResult);
      }

      setPois(nearbyPois);

      // Step 3: Init Mapbox map
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (token && mapContainer.current && !mapRef.current) {
        const mapboxgl = (await import("mapbox-gl")).default;

        mapboxgl.accessToken = token;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [geo.lng, geo.lat],
          zoom: 16,
          pitch: 55,
          bearing: -20,
          antialias: true,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl(), "top-left");

        map.on("load", () => {
          // 3D terrain
          map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: "mapbox-dem", exaggeration: 1.8 });

          // 3D buildings
          map.addSource("composite-buildings", {
            type: "vector",
            url: "mapbox://mapbox.mapbox-streets-v8",
          });
          map.addLayer({
            id: "3d-buildings",
            source: "composite-buildings",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#c0c0c0",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.5,
            },
          });

          // Lot boundary
          const latDeg = lotDepth / 111_111;
          const lngDeg = lotWidth / (111_111 * Math.cos((geo.lat * Math.PI) / 180));
          const halfLat = latDeg / 2;
          const halfLng = lngDeg / 2;

          map.addSource("lot-boundary", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [geo.lng - halfLng, geo.lat - halfLat],
                    [geo.lng + halfLng, geo.lat - halfLat],
                    [geo.lng + halfLng, geo.lat + halfLat],
                    [geo.lng - halfLng, geo.lat + halfLat],
                    [geo.lng - halfLng, geo.lat - halfLat],
                  ],
                ],
              },
            },
          });

          map.addLayer({
            id: "lot-boundary-line",
            type: "line",
            source: "lot-boundary",
            paint: {
              "line-color": "#ef4444",
              "line-width": 3,
              "line-dasharray": [2, 1],
            },
          });

          map.addLayer({
            id: "lot-boundary-fill",
            type: "fill",
            source: "lot-boundary",
            paint: {
              "fill-color": "#ef4444",
              "fill-opacity": 0.08,
            },
          });

          // Center marker
          new mapboxgl.Marker({ color: "#E8A838" })
            .setLngLat([geo.lng, geo.lat])
            .addTo(map);

          // POI markers
          nearbyPois.slice(0, 15).forEach((poi) => {
            const el = document.createElement("div");
            el.style.width = "10px";
            el.style.height = "10px";
            el.style.borderRadius = "50%";
            el.style.backgroundColor = poi.color;
            el.style.border = "2px solid white";
            el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

            new mapboxgl.Marker(el)
              .setLngLat([poi.lng, poi.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 10 }).setHTML(
                  `<strong>${poi.name}</strong><br/>${poi.label} · ${poi.distanceM < 1000 ? `${poi.distanceM}m` : `${(poi.distanceM / 1000).toFixed(1)}km`}`
                )
              )
              .addTo(map);
          });
        });
      }
    } catch {
      setError("Erro ao carregar dados do terreno.");
    } finally {
      setLoading(false);
    }
  }, [cep, lotWidth, lotDepth]);

  // Trigger on CEP change
  useEffect(() => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8 && lotWidth > 0 && lotDepth > 0) {
      loadTerrainData();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [cep, lotWidth, lotDepth, loadTerrainData]);

  const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!cep || cep.replace(/\D/g, "").length < 8) return null;
  if (!frontMeters && !backMeters && !leftMeters && !rightMeters) return null;

  return (
    <Card className="overflow-hidden border-[var(--accent)]/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4 text-[var(--accent)]" />
          Mapa 3D do Terreno
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Mapbox 3D Map */}
        {hasMapboxToken && (
          <div
            ref={mapContainer}
            className="h-[280px] w-full overflow-hidden rounded-xl border border-border/40"
          />
        )}

        {!hasMapboxToken && geoPoint && (
          <div className="flex h-[200px] items-center justify-center rounded-xl bg-[var(--primary)]/5">
            <p className="text-sm text-muted-foreground">
              Configure NEXT_PUBLIC_MAPBOX_TOKEN para ver o mapa 3D
            </p>
          </div>
        )}

        {/* Slope Analysis */}
        {slope && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[var(--primary)]/5 p-3 text-center">
              <Mountain className="mx-auto mb-1 size-4 text-[var(--accent)]" />
              <p className="text-lg font-bold text-[var(--primary)]">
                {slope.avgSlopePercent}%
              </p>
              <p className="text-[10px] text-muted-foreground">Decliv. Media</p>
            </div>
            <div className="rounded-xl bg-[var(--primary)]/5 p-3 text-center">
              <Mountain className="mx-auto mb-1 size-4 text-[var(--accent)]" />
              <p className="text-lg font-bold text-[var(--primary)]">
                {slope.elevationRangeM}m
              </p>
              <p className="text-[10px] text-muted-foreground">Desnivel</p>
            </div>
            <div className="rounded-xl bg-[var(--primary)]/5 p-3 text-center">
              <Compass className="mx-auto mb-1 size-4 text-[var(--accent)]" />
              <p className="text-xs font-semibold text-[var(--primary)] leading-tight mt-1">
                {slope.aspectLabel}
              </p>
              <p className="text-[10px] text-muted-foreground">Aspecto</p>
            </div>
            <div className="rounded-xl bg-[var(--primary)]/5 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Classe</p>
              <SlopeClassBadge slopeClass={slope.slopeClass} />
            </div>
          </div>
        )}

        {/* Nearby POIs */}
        {pois.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--primary)]">
              Pontos de Interesse Proximos
            </p>
            <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
              {pois.slice(0, 12).map((poi) => {
                const meta = CATEGORY_META[poi.category];
                const Icon = meta?.icon ?? MapPin;
                return (
                  <div
                    key={poi.id}
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs"
                  >
                    <Icon className={`size-3.5 shrink-0 ${meta?.color ?? "text-gray-500"}`} />
                    <span className="flex-1 truncate text-[var(--primary)]">
                      {poi.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {poi.distanceM < 1000
                        ? `${poi.distanceM}m`
                        : `${(poi.distanceM / 1000).toFixed(1)}km`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {geoPoint && (
          <p className="text-[10px] text-muted-foreground">
            {geoPoint.city}, {geoPoint.state} — Lat: {geoPoint.lat.toFixed(4)}, Lng: {geoPoint.lng.toFixed(4)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
