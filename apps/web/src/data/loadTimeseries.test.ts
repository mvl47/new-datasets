import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadTimeseriesPv,
  loadTimeseriesWindOnshore,
  parseTimeseriesPayload,
} from './loadTimeseries';
import { HOURS_IN_YEAR, setTimeseriesPvOverride } from './timeseriesPv';
import { setTimeseriesWindOnshoreOverride } from './timeseriesWind';
import { useTimeseriesStore } from '../state/timeseriesStore';

function payload(hoursInYear: number) {
  const national = new Array(hoursInYear).fill(0).map((_, i) => i * 0.5);
  const series = new Array(hoursInYear).fill(0).map((_, i) => i * 0.25);
  return {
    hoursInYear,
    national,
    byBundesland: { BY: series, NW: series, XX: series },
  };
}

beforeEach(() => {
  setTimeseriesPvOverride(null);
  setTimeseriesWindOnshoreOverride(null);
  useTimeseriesStore.setState({ pvStatus: 'idle', windOnshoreStatus: 'idle' });
});

afterEach(() => {
  setTimeseriesPvOverride(null);
  setTimeseriesWindOnshoreOverride(null);
});

describe('parseTimeseriesPayload', () => {
  it('keeps only known Bundesland codes with matching series length', () => {
    const parsed = parseTimeseriesPayload(payload(3));
    expect(parsed?.hoursInYear).toBe(3);
    expect(parsed?.national.length).toBe(3);
    expect(parsed?.byBundesland.BY?.length).toBe(3);
    expect(parsed?.byBundesland).not.toHaveProperty('XX');
  });

  it('rejects malformed shapes', () => {
    expect(parseTimeseriesPayload(null)).toBeNull();
    expect(parseTimeseriesPayload({})).toBeNull();
    expect(parseTimeseriesPayload({ hoursInYear: 0, national: [], byBundesland: {} })).toBeNull();
    expect(
      parseTimeseriesPayload({
        hoursInYear: 3,
        national: [1, 2],
        byBundesland: { BY: [1, 2, 3] },
      }),
    ).toBeNull();
  });
});

describe('loadTimeseriesPv', () => {
  it('only accepts the canonical 8760-hour year and marks loaded', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(payload(HOURS_IN_YEAR)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    const result = await loadTimeseriesPv('/data/timeseries-pv.json', fetcher);
    expect(result).not.toBeNull();
    expect(useTimeseriesStore.getState().pvStatus).toBe('loaded');
  });

  it('rejects payloads with the wrong hour count and marks missing', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(payload(100)), { status: 200 }),
    ) as unknown as typeof fetch;
    const result = await loadTimeseriesPv('/data/timeseries-pv.json', fetcher);
    expect(result).toBeNull();
    expect(useTimeseriesStore.getState().pvStatus).toBe('missing');
  });

  it('marks missing on 404', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    const result = await loadTimeseriesPv('/data/timeseries-pv.json', fetcher);
    expect(result).toBeNull();
    expect(useTimeseriesStore.getState().pvStatus).toBe('missing');
  });
});

describe('loadTimeseriesWindOnshore', () => {
  it('marks loaded on success', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(payload(HOURS_IN_YEAR)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    const ok = await loadTimeseriesWindOnshore('/data/timeseries-wind.json', fetcher);
    expect(ok).toBe(true);
    expect(useTimeseriesStore.getState().windOnshoreStatus).toBe('loaded');
  });

  it('marks missing on network error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const ok = await loadTimeseriesWindOnshore('/data/timeseries-wind.json', fetcher);
    expect(ok).toBe(false);
    expect(useTimeseriesStore.getState().windOnshoreStatus).toBe('missing');
  });
});
