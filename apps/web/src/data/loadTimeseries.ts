import { isBundeslandCode, type BundeslandCode } from './bundeslaender';
import { HOURS_IN_YEAR, setTimeseriesPvOverride, type TimeseriesPvData } from './timeseriesPv';
import { setTimeseriesWindOnshoreOverride } from './timeseriesWind';
import { useTimeseriesStore } from '../state/timeseriesStore';

interface ParsedPayload {
  hoursInYear: number;
  byBundesland: Partial<Record<BundeslandCode, Float32Array>>;
  national: Float32Array;
}

const ZERO_CAPACITIES: Record<BundeslandCode, number> = {
  BW: 0, BY: 0, BE: 0, BB: 0, HB: 0, HH: 0, HE: 0, MV: 0,
  NI: 0, NW: 0, RP: 0, SL: 0, SN: 0, ST: 0, SH: 0, TH: 0,
};

function toFloat32(values: unknown, expectedLength?: number): Float32Array | null {
  if (!Array.isArray(values)) return null;
  if (expectedLength !== undefined && values.length !== expectedLength) return null;
  const arr = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    arr[i] = v;
  }
  return arr;
}

export function parseTimeseriesPayload(raw: unknown): ParsedPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as { hoursInYear?: unknown; byBundesland?: unknown; national?: unknown };
  if (typeof candidate.hoursInYear !== 'number' || candidate.hoursInYear <= 0) return null;
  const national = toFloat32(candidate.national, candidate.hoursInYear);
  if (!national) return null;
  if (typeof candidate.byBundesland !== 'object' || candidate.byBundesland === null) return null;

  const byBundesland: Partial<Record<BundeslandCode, Float32Array>> = {};
  for (const [code, series] of Object.entries(candidate.byBundesland as Record<string, unknown>)) {
    if (!isBundeslandCode(code)) continue;
    const arr = toFloat32(series, candidate.hoursInYear);
    if (arr) byBundesland[code] = arr;
  }
  if (Object.keys(byBundesland).length === 0) return null;

  return { hoursInYear: candidate.hoursInYear, byBundesland, national };
}

function expandToAllCodes(
  partial: Partial<Record<BundeslandCode, Float32Array>>,
  length: number,
): Record<BundeslandCode, Float32Array> {
  const out = {} as Record<BundeslandCode, Float32Array>;
  for (const code of Object.keys(ZERO_CAPACITIES) as BundeslandCode[]) {
    out[code] = partial[code] ?? new Float32Array(length);
  }
  return out;
}

function expandCapacities(
  byBundesland: Record<BundeslandCode, Float32Array>,
): Record<BundeslandCode, number> {
  const caps = { ...ZERO_CAPACITIES };
  for (const code of Object.keys(byBundesland) as BundeslandCode[]) {
    let peak = 0;
    const series = byBundesland[code];
    for (let i = 0; i < series.length; i++) if (series[i]! > peak) peak = series[i]!;
    caps[code] = Math.round(peak);
  }
  return caps;
}

export async function loadTimeseriesPv(
  url = '/data/timeseries-pv.json',
  fetcher: typeof fetch = fetch,
): Promise<TimeseriesPvData | null> {
  useTimeseriesStore.getState().setPvStatus('loading');
  try {
    const response = await fetcher(url, { cache: 'force-cache' });
    if (!response.ok) {
      useTimeseriesStore.getState().setPvStatus('missing');
      return null;
    }
    const parsed = parseTimeseriesPayload(await response.json());
    if (!parsed) {
      useTimeseriesStore.getState().setPvStatus('missing');
      return null;
    }
    if (parsed.hoursInYear !== HOURS_IN_YEAR) {
      useTimeseriesStore.getState().setPvStatus('missing');
      return null;
    }
    const byBundesland = expandToAllCodes(parsed.byBundesland, parsed.hoursInYear);
    const capacities = expandCapacities(byBundesland);
    setTimeseriesPvOverride({ capacities, byBundesland, national: parsed.national });
    useTimeseriesStore.getState().setPvStatus('loaded');
    return { capacities, byBundesland, national: parsed.national };
  } catch {
    useTimeseriesStore.getState().setPvStatus('missing');
    return null;
  }
}

export async function loadTimeseriesWindOnshore(
  url = '/data/timeseries-wind.json',
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  useTimeseriesStore.getState().setWindOnshoreStatus('loading');
  try {
    const response = await fetcher(url, { cache: 'force-cache' });
    if (!response.ok) {
      useTimeseriesStore.getState().setWindOnshoreStatus('missing');
      return false;
    }
    const parsed = parseTimeseriesPayload(await response.json());
    if (!parsed || parsed.hoursInYear !== HOURS_IN_YEAR) {
      useTimeseriesStore.getState().setWindOnshoreStatus('missing');
      return false;
    }
    const byBundesland = expandToAllCodes(parsed.byBundesland, parsed.hoursInYear);
    const capacities = expandCapacities(byBundesland);
    setTimeseriesWindOnshoreOverride({ capacities, byBundesland, national: parsed.national });
    useTimeseriesStore.getState().setWindOnshoreStatus('loaded');
    return true;
  } catch {
    useTimeseriesStore.getState().setWindOnshoreStatus('missing');
    return false;
  }
}
