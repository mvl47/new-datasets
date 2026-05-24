import {
  isBundeslandCode,
  setBundeslandGeometryOverrides,
  type BundeslandCode,
  type BundeslandGeometry,
} from './bundeslaender';
import { useBoundariesStore } from '../state/boundariesStore';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: BundeslandGeometry | { type: string };
  properties?: Record<string, unknown> | null;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

function isGeometry(value: unknown): value is BundeslandGeometry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { type?: unknown; coordinates?: unknown };
  return (
    (v.type === 'Polygon' || v.type === 'MultiPolygon') && Array.isArray(v.coordinates)
  );
}

export function parseBoundariesFeatureCollection(
  fc: unknown,
): Map<BundeslandCode, BundeslandGeometry> | null {
  if (typeof fc !== 'object' || fc === null) return null;
  const candidate = fc as Partial<GeoJsonFeatureCollection>;
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    return null;
  }
  const map = new Map<BundeslandCode, BundeslandGeometry>();
  for (const feature of candidate.features) {
    const code = feature?.properties?.code;
    const geometry = feature?.geometry;
    if (isBundeslandCode(code) && isGeometry(geometry)) {
      map.set(code, geometry);
    }
  }
  return map.size > 0 ? map : null;
}

export async function loadBoundaries(
  url = '/data/bundeslaender.geojson',
  fetcher: typeof fetch = fetch,
): Promise<Map<BundeslandCode, BundeslandGeometry> | null> {
  useBoundariesStore.getState().markLoading();
  try {
    const response = await fetcher(url, { cache: 'force-cache' });
    if (!response.ok) {
      useBoundariesStore.getState().markMissing();
      return null;
    }
    const fc = (await response.json()) as unknown;
    const map = parseBoundariesFeatureCollection(fc);
    if (!map) {
      useBoundariesStore.getState().markMissing();
      return null;
    }
    setBundeslandGeometryOverrides(map);
    useBoundariesStore.getState().setOverrides(map);
    return map;
  } catch {
    useBoundariesStore.getState().markMissing();
    return null;
  }
}
