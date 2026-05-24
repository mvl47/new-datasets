import { MASTR_TECHS, setMastrCleanedOverride, type MastrPlant, type MastrTech } from './mastrClean';
import { useMastrStore } from '../state/mastrStore';

function isMastrTech(value: unknown): value is MastrTech {
  return typeof value === 'string' && (MASTR_TECHS as ReadonlyArray<string>).includes(value);
}

interface PointFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

export function parseMastrFeatureCollection(raw: unknown): MastrPlant[] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as { type?: unknown; features?: unknown };
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    return null;
  }
  const plants: MastrPlant[] = [];
  for (const feature of candidate.features as PointFeature[]) {
    const geom = feature?.geometry;
    if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) continue;
    const [lon, lat] = geom.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;
    const props = feature.properties ?? {};
    const tech = props.tech;
    const capacityKw = Number(props.capacityKw);
    if (!isMastrTech(tech) || !Number.isFinite(capacityKw) || capacityKw <= 0) continue;
    const id = typeof props.id === 'string' && props.id ? props.id : `r-${plants.length}`;
    const yearRaw = props.commissioningYear;
    const commissioningYear =
      typeof yearRaw === 'number' && Number.isFinite(yearRaw)
        ? Math.floor(yearRaw)
        : new Date().getUTCFullYear();
    plants.push({ id, lon, lat, tech, capacityKw, commissioningYear });
  }
  return plants.length > 0 ? plants : null;
}

export async function loadMastr(
  url = '/data/mastr-clean.geojson',
  fetcher: typeof fetch = fetch,
): Promise<ReadonlyArray<MastrPlant> | null> {
  useMastrStore.getState().markLoading();
  try {
    const response = await fetcher(url, { cache: 'force-cache' });
    if (!response.ok) {
      useMastrStore.getState().markMissing();
      return null;
    }
    const plants = parseMastrFeatureCollection(await response.json());
    if (!plants) {
      useMastrStore.getState().markMissing();
      return null;
    }
    setMastrCleanedOverride(plants);
    useMastrStore.getState().setPlants(plants);
    return plants;
  } catch {
    useMastrStore.getState().markMissing();
    return null;
  }
}
