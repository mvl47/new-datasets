import { isBundeslandCode, type BundeslandCode } from './bundeslaender';
import { setPopulationOverride } from './population';
import { usePopulationStore, type RealPopulationData } from '../state/populationStore';

export function parsePopulationPayload(raw: unknown): RealPopulationData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as { years?: unknown; byBundesland?: unknown };
  if (!Array.isArray(candidate.years) || candidate.years.length === 0) return null;
  if (typeof candidate.byBundesland !== 'object' || candidate.byBundesland === null) return null;

  const years: number[] = [];
  for (const y of candidate.years) {
    if (typeof y === 'number' && Number.isFinite(y)) years.push(y);
  }
  if (years.length === 0) return null;

  const byBundesland: Partial<Record<BundeslandCode, ReadonlyArray<number>>> = {};
  const source = candidate.byBundesland as Record<string, unknown>;
  for (const [code, series] of Object.entries(source)) {
    if (!isBundeslandCode(code)) continue;
    if (!Array.isArray(series)) continue;
    const numeric: number[] = [];
    for (const v of series) {
      if (typeof v === 'number' && Number.isFinite(v)) numeric.push(v);
    }
    if (numeric.length === years.length) byBundesland[code] = numeric;
  }
  return Object.keys(byBundesland).length > 0 ? { years, byBundesland } : null;
}

export async function loadPopulation(
  url = '/data/population.json',
  fetcher: typeof fetch = fetch,
): Promise<RealPopulationData | null> {
  usePopulationStore.getState().markLoading();
  try {
    const response = await fetcher(url, { cache: 'force-cache' });
    if (!response.ok) {
      usePopulationStore.getState().markMissing();
      return null;
    }
    const data = parsePopulationPayload(await response.json());
    if (!data) {
      usePopulationStore.getState().markMissing();
      return null;
    }
    setPopulationOverride({
      years: data.years,
      byBundesland: data.byBundesland,
      baselineYear: data.years[0] ?? 0,
    });
    usePopulationStore.getState().setData(data);
    return data;
  } catch {
    usePopulationStore.getState().markMissing();
    return null;
  }
}
