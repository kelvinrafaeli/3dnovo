/**
 * Real satellite elevation data pipeline — no API key required.
 *
 * Pipeline:
 *   1. CEP → city/state via ViaCEP (free, Brazil-specific)
 *   2. city/state → lat/lng via Nominatim OSM (free, no auth)
 *   3. lat/lng + lot dimensions → elevation grid via Open-Elevation (free, no auth)
 *   4. Compute slope from elevation grid
 *
 * All steps degrade gracefully — if any step fails, the caller receives null
 * and the UI falls back to AI-generated or static values.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

export interface ElevationGrid {
  /** [row][col] — row 0 = north edge (lot front), last row = south (lot back) */
  points: { lat: number; lng: number; elevation: number }[][];
  cols: number;
  rows: number;
  minElevation: number;
  maxElevation: number;
  centerLat: number;
  centerLng: number;
}

export interface SlopeAnalysis {
  /** Maximum slope among all interior grid points (%) */
  maxSlopePercent: number;
  /** Mean slope across the lot (%) */
  avgSlopePercent: number;
  /** Max elevation − min elevation (meters) */
  elevationRangeM: number;
  /** <3% plano, 3-8% suave, 8-20% moderado, >20% forte */
  slopeClass: 'plano' | 'suave' | 'moderado' | 'forte';
  /** Human-readable Portuguese label for the dominant slope direction */
  aspectLabel: string;
}

// ── Step 1: CEP → GeoPoint ─────────────────────────────────────────────────

/**
 * Geocode a Brazilian CEP to a {lat, lng, city, state} using ViaCEP + Nominatim.
 * Returns null on any network or parsing error (caller should degrade gracefully).
 */
export async function geocodeCEP(cep: string): Promise<GeoPoint | null> {
  try {
    // Clean CEP
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    // Step 1a: ViaCEP — get city and state
    const viaRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!viaRes.ok) return null;
    const viaData = await viaRes.json();
    if (viaData.erro) return null;

    const city: string  = viaData.localidade || '';
    const state: string = viaData.uf || '';
    const street: string = viaData.logradouro || '';
    const hood: string   = viaData.bairro || '';
    if (!city || !state) return null;

    // Step 1b: Nominatim OSM — try street-level first, then neighbourhood, then city
    // (ViaCEP returns logradouro + bairro for most CEPs, giving much better precision)
    const queries = [
      street && hood ? `${street}, ${hood}, ${city}, ${state}, Brasil` : null,
      hood           ? `${hood}, ${city}, ${state}, Brasil`             : null,
      `${city}, ${state}, Brasil`,
    ].filter(Boolean) as string[];

    let lat = NaN, lng = NaN;
    for (const q of queries) {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'ArqAI/1.0 (contact@arqai.com.br)' } }
      );
      if (!nomRes.ok) continue;
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        lat = parseFloat(nomData[0].lat);
        lng = parseFloat(nomData[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) break;
      }
    }

    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng, city, state };
  } catch {
    return null;
  }
}

// ── Step 2: Elevation grid from Open-Elevation ────────────────────────────────

/**
 * Fetch a gridSize × gridSize elevation grid centred at (lat, lng), spanning
 * widthM metres east-west and depthM metres north-south.
 *
 * Uses the Open-Elevation public API: https://api.open-elevation.com
 * (free, no API key, ~30m SRTM data globally)
 */
export async function fetchElevationGrid(
  lat: number,
  lng: number,
  widthM: number,
  depthM: number,
  gridSize = 5
): Promise<ElevationGrid | null> {
  try {
    // Degree offsets from metres
    const latDeg = depthM / 111_111;
    const lngDeg = widthM / (111_111 * Math.cos((lat * Math.PI) / 180));

    const startLat = lat - latDeg / 2;
    const startLng = lng - lngDeg / 2;
    const latStep = latDeg / (gridSize - 1);
    const lngStep = lngDeg / (gridSize - 1);

    // Build flat list of locations (row-major order)
    const locations: { latitude: number; longitude: number }[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        locations.push({
          latitude: startLat + row * latStep,
          longitude: startLng + col * lngStep,
        });
      }
    }

    const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ locations }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results: { elevation: number }[] = data.results;
    if (!results || results.length !== locations.length) return null;

    // Reconstruct [row][col] grid
    const points: ElevationGrid['points'] = [];
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let row = 0; row < gridSize; row++) {
      points.push([]);
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        const elev = results[idx].elevation;
        const ptLat = locations[idx].latitude;
        const ptLng = locations[idx].longitude;
        points[row].push({ lat: ptLat, lng: ptLng, elevation: elev });
        if (elev < minElevation) minElevation = elev;
        if (elev > maxElevation) maxElevation = elev;
      }
    }

    return {
      points,
      cols: gridSize,
      rows: gridSize,
      minElevation,
      maxElevation,
      centerLat: lat,
      centerLng: lng,
    };
  } catch {
    return null;
  }
}

// ── Step 3: Slope analysis ────────────────────────────────────────────────────

/**
 * Compute slope statistics from an elevation grid.
 * Uses central-difference gradient for interior points.
 */
export function computeSlope(
  grid: ElevationGrid,
  widthM: number,
  depthM: number
): SlopeAnalysis {
  const { points, rows, cols, minElevation, maxElevation } = grid;

  const cellW = widthM / (cols - 1);  // metres per column step
  const cellD = depthM / (rows - 1);  // metres per row step

  const slopes: number[] = [];
  let sumDx = 0;
  let sumDy = 0;
  let count = 0;

  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      // Central difference gradient (rise/run, dimensionless)
      const dx = (points[row][col + 1].elevation - points[row][col - 1].elevation) / (2 * cellW);
      const dy = (points[row + 1][col].elevation - points[row - 1][col].elevation) / (2 * cellD);
      const slopePct = Math.sqrt(dx * dx + dy * dy) * 100;
      slopes.push(slopePct);
      sumDx += dx;
      sumDy += dy;
      count++;
    }
  }

  const maxSlopePercent = slopes.length > 0 ? Math.max(...slopes) : 0;
  const avgSlopePercent = slopes.length > 0
    ? slopes.reduce((a, b) => a + b, 0) / slopes.length
    : 0;
  const elevationRangeM = maxElevation - minElevation;

  const slopeClass: SlopeAnalysis['slopeClass'] =
    avgSlopePercent < 3  ? 'plano'    :
    avgSlopePercent < 8  ? 'suave'    :
    avgSlopePercent < 20 ? 'moderado' : 'forte';

  // Dominant aspect (average gradient direction)
  const avgDx = count > 0 ? sumDx / count : 0;
  const avgDy = count > 0 ? sumDy / count : 0;
  const threshold = 0.01; // ~1% to classify as having direction
  let aspectLabel = 'praticamente plano';
  if (Math.abs(avgDy) > Math.abs(avgDx)) {
    if (avgDy > threshold)       aspectLabel = 'caindo para a frente';
    else if (avgDy < -threshold) aspectLabel = 'caindo para o fundo';
  } else {
    if (avgDx > threshold)       aspectLabel = 'caindo para a direita';
    else if (avgDx < -threshold) aspectLabel = 'caindo para a esquerda';
  }

  return {
    maxSlopePercent: Math.round(maxSlopePercent * 10) / 10,
    avgSlopePercent: Math.round(avgSlopePercent * 10) / 10,
    elevationRangeM: Math.round(elevationRangeM * 10) / 10,
    slopeClass,
    aspectLabel,
  };
}

// ── Step 4: Nearby POIs via Overpass API (OpenStreetMap) ──────────────────────

export interface POI {
  id: string;
  name: string;
  amenity: string;
  category: 'education' | 'health' | 'food' | 'transport' | 'recreation' | 'finance';
  label: string;
  lat: number;
  lng: number;
  distanceM: number;
  color: string;
}

const AMENITY_META: Record<string, { category: POI['category']; label: string; color: string }> = {
  school:        { category: 'education',   label: 'Escola',             color: '#3b82f6' },
  kindergarten:  { category: 'education',   label: 'Creche/Jardim',      color: '#3b82f6' },
  university:    { category: 'education',   label: 'Universidade',       color: '#3b82f6' },
  library:       { category: 'education',   label: 'Biblioteca',         color: '#3b82f6' },
  hospital:      { category: 'health',      label: 'Hospital',           color: '#ef4444' },
  clinic:        { category: 'health',      label: 'Clínica',            color: '#ef4444' },
  pharmacy:      { category: 'health',      label: 'Farmácia',           color: '#ef4444' },
  dentist:       { category: 'health',      label: 'Dentista',           color: '#ef4444' },
  doctors:       { category: 'health',      label: 'Consultório',        color: '#ef4444' },
  supermarket:   { category: 'food',        label: 'Supermercado',       color: '#16a34a' },
  convenience:   { category: 'food',        label: 'Mercearia',          color: '#16a34a' },
  bakery:        { category: 'food',        label: 'Padaria',            color: '#16a34a' },
  restaurant:    { category: 'food',        label: 'Restaurante',        color: '#16a34a' },
  cafe:          { category: 'food',        label: 'Café',               color: '#16a34a' },
  bus_station:   { category: 'transport',   label: 'Terminal de Ônibus', color: '#d97706' },
  bus_stop:      { category: 'transport',   label: 'Ponto de Ônibus',    color: '#d97706' },
  park:          { category: 'recreation',  label: 'Parque',             color: '#059669' },
  playground:    { category: 'recreation',  label: 'Playground',         color: '#059669' },
  sports_centre: { category: 'recreation',  label: 'Centro Esportivo',   color: '#059669' },
  bank:          { category: 'finance',     label: 'Banco',              color: '#7c3aed' },
  atm:           { category: 'finance',     label: 'Caixa Eletrônico',   color: '#7c3aed' },
};

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch nearby points of interest via Overpass API (OpenStreetMap data).
 * Free, no API key. Returns up to 60 POIs sorted by distance.
 */
export async function fetchNearbyPOIs(lat: number, lng: number, radiusM = 1000): Promise<POI[]> {
  try {
    const amenities = Object.keys(AMENITY_META).join('|');
    const query = [
      '[out:json][timeout:25];',
      '(',
      `  node["amenity"~"${amenities}"](around:${radiusM},${lat},${lng});`,
      `  node["shop"~"supermarket|convenience|bakery"](around:${radiusM},${lat},${lng});`,
      `  way["amenity"~"school|kindergarten|hospital|clinic|pharmacy|supermarket|bus_station|park|bank|library"](around:${radiusM},${lat},${lng});`,
      ');',
      'out center body;',
    ].join('\n');

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
    });
    if (!res.ok) return [];

    const data = await res.json();
    const elements: any[] = data.elements ?? [];

    const pois: POI[] = [];
    const seen = new Set<string>();

    for (const el of elements) {
      const poiLat = el.lat ?? el.center?.lat;
      const poiLng = el.lon ?? el.center?.lon;
      if (poiLat == null || poiLng == null) continue;

      const amenity: string = el.tags?.amenity ?? el.tags?.shop ?? '';
      const meta = AMENITY_META[amenity];
      if (!meta) continue;

      const name: string = el.tags?.name ?? meta.label;
      // Deduplicate by name+amenity+rounded coords
      const key = `${amenity}:${name}:${Math.round(poiLat * 1000)}:${Math.round(poiLng * 1000)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pois.push({
        id: `${el.type}-${el.id}`,
        name,
        amenity,
        category: meta.category,
        label: meta.label,
        lat: poiLat,
        lng: poiLng,
        distanceM: Math.round(haversineM(lat, lng, poiLat, poiLng)),
        color: meta.color,
      });
    }

    return pois.sort((a, b) => a.distanceM - b.distanceM).slice(0, 60);
  } catch {
    return [];
  }
}
