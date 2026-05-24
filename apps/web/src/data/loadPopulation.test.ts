import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPopulation, parsePopulationPayload } from './loadPopulation';
import { setPopulationOverride } from './population';
import { usePopulationStore } from '../state/populationStore';

const SAMPLE = {
  years: [2010, 2011, 2012],
  byBundesland: {
    BY: [12541000, 12600000, 12700000],
    NW: [17841000, 17850000, 17870000],
    XX: [1, 2, 3],
  },
};

beforeEach(() => {
  setPopulationOverride(null);
  usePopulationStore.setState({ data: null, status: 'idle' });
});

afterEach(() => {
  setPopulationOverride(null);
});

describe('parsePopulationPayload', () => {
  it('keeps only entries with known Bundesland codes and matching length', () => {
    const parsed = parsePopulationPayload(SAMPLE);
    expect(parsed).not.toBeNull();
    expect(parsed?.years).toEqual([2010, 2011, 2012]);
    expect(Object.keys(parsed!.byBundesland)).toEqual(expect.arrayContaining(['BY', 'NW']));
    expect(Object.keys(parsed!.byBundesland)).not.toContain('XX');
  });

  it('drops series whose length does not match the years axis', () => {
    const parsed = parsePopulationPayload({
      years: [2010, 2011],
      byBundesland: { BY: [12000000] },
    });
    expect(parsed).toBeNull();
  });

  it('returns null for malformed inputs', () => {
    expect(parsePopulationPayload(null)).toBeNull();
    expect(parsePopulationPayload({ years: [] })).toBeNull();
    expect(parsePopulationPayload({ years: [2010], byBundesland: null })).toBeNull();
  });
});

describe('loadPopulation', () => {
  it('marks loaded and applies override on success', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(SAMPLE), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;
    const result = await loadPopulation('/data/population.json', fetcher);
    expect(result).not.toBeNull();
    expect(usePopulationStore.getState().status).toBe('loaded');
  });

  it('marks missing on 404', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    const result = await loadPopulation('/data/population.json', fetcher);
    expect(result).toBeNull();
    expect(usePopulationStore.getState().status).toBe('missing');
  });

  it('marks missing on network error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const result = await loadPopulation('/data/population.json', fetcher);
    expect(result).toBeNull();
    expect(usePopulationStore.getState().status).toBe('missing');
  });
});
