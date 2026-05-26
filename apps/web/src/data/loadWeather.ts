import { isBundeslandCode, type BundeslandCode } from './bundeslaender';
import { setWeatherOverride, type BundeslandClimate, type MonthlyClimate } from './weather';
import { useWeatherStore } from '../state/weatherStore';

function parseMonthlyArray(value: unknown): MonthlyClimate[] | null {
  if (!Array.isArray(value) || value.length !== 12) return null;
  const out: MonthlyClimate[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const e = entry as { tempC?: unknown; precipMm?: unknown };
    if (
      typeof e.tempC !== 'number' ||
      !Number.isFinite(e.tempC) ||
      typeof e.precipMm !== 'number' ||
      !Number.isFinite(e.precipMm)
    ) {
      return null;
    }
    out.push({ tempC: e.tempC, precipMm: e.precipMm });
  }
  return out;
}

export function parseWeatherPayload(
  raw: unknown,
): Partial<Record<BundeslandCode, BundeslandClimate>> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const byBundesland = (raw as { byBundesland?: unknown }).byBundesland;
  if (typeof byBundesland !== 'object' || byBundesland === null) return null;
  const out: Partial<Record<BundeslandCode, BundeslandClimate>> = {};
  for (const [code, entry] of Object.entries(byBundesland as Record<string, unknown>)) {
    if (!isBundeslandCode(code)) continue;
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as { monthly?: unknown; meanTempC?: unknown; annualPrecipMm?: unknown };
    const monthly = parseMonthlyArray(e.monthly);
    if (!monthly) continue;
    if (typeof e.meanTempC !== 'number' || typeof e.annualPrecipMm !== 'number') continue;
    out[code] = {
      monthly,
      meanTempC: e.meanTempC,
      annualPrecipMm: e.annualPrecipMm,
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function loadWeather(
  url = '/data/weather.json',
  fetcher: typeof fetch = fetch,
): Promise<Partial<Record<BundeslandCode, BundeslandClimate>> | null> {
  useWeatherStore.getState().markLoading();
  try {
    const response = await fetcher(url, { cache: 'force-cache' });
    if (!response.ok) {
      useWeatherStore.getState().markMissing();
      return null;
    }
    const parsed = parseWeatherPayload(await response.json());
    if (!parsed) {
      useWeatherStore.getState().markMissing();
      return null;
    }
    setWeatherOverride(parsed);
    useWeatherStore.getState().setData(parsed);
    return parsed;
  } catch {
    useWeatherStore.getState().markMissing();
    return null;
  }
}
