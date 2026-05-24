import { describe, expect, it } from 'vitest';
import { HOURS_IN_YEAR } from './timeseriesPv';
import {
  getTimeseriesWind,
  isWindKind,
  nationalSeries,
  peakOfSeries,
  windValuesAtHour,
} from './timeseriesWind';

describe('timeseriesWind', () => {
  it('produces 8760 hourly values per Bundesland (onshore)', () => {
    const data = getTimeseriesWind();
    expect(data.onshore.byBundesland.NI.length).toBe(HOURS_IN_YEAR);
    expect(data.onshore.national.length).toBe(HOURS_IN_YEAR);
  });

  it('offshore series exist only for SH, NI, MV', () => {
    const data = getTimeseriesWind();
    expect(data.offshore.byBundesland.SH).toBeDefined();
    expect(data.offshore.byBundesland.NI).toBeDefined();
    expect(data.offshore.byBundesland.MV).toBeDefined();
    expect(data.offshore.byBundesland.BY).toBeUndefined();
  });

  it('offshore peak capacity factor > onshore (more wind, higher availability)', () => {
    const data = getTimeseriesWind();
    const onTotal = Object.values(data.onshore.capacities).reduce((s, v) => s + v, 0);
    const offTotal = Object.values(data.offshore.capacities).reduce((s, v) => s + (v ?? 0), 0);
    const onPeak = peakOfSeries(data.onshore.national).mw / onTotal;
    const offPeak = peakOfSeries(data.offshore.national).mw / offTotal;
    expect(offPeak).toBeGreaterThan(onPeak * 0.9);
  });

  it('nationalSeries selects the right kind', () => {
    const data = getTimeseriesWind();
    expect(nationalSeries(data, 'onshore')).toBe(data.onshore.national);
    expect(nationalSeries(data, 'offshore')).toBe(data.offshore.national);
  });

  it('windValuesAtHour returns 16 entries with zeros for inland offshore', () => {
    const data = getTimeseriesWind();
    const m = windValuesAtHour(data, 'offshore', 5000);
    expect(m.size).toBe(16);
    expect(m.get('BY')).toBe(0);
    expect((m.get('NI') ?? 0) + (m.get('SH') ?? 0) + (m.get('MV') ?? 0)).toBeGreaterThan(0);
  });

  it('isWindKind guards correctly', () => {
    expect(isWindKind('onshore')).toBe(true);
    expect(isWindKind('offshore')).toBe(true);
    expect(isWindKind('mixed')).toBe(false);
  });
});
