import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadMastr, parseMastrFeatureCollection } from './loadMastr';
import { setMastrCleanedOverride } from './mastrClean';
import { useMastrStore } from '../state/mastrStore';

const SAMPLE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [11.5, 48.1] },
      properties: { id: 'SEE001', tech: 'solar', capacityKw: 9.5, commissioningYear: 2018 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [9.7, 54.2] },
      properties: { id: 'SEE002', tech: 'wind', capacityKw: 3000, commissioningYear: 2016 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [10, 50] },
      properties: { id: 'SEE003', tech: 'xenon', capacityKw: 100 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [10, 50] },
      properties: { id: 'SEE004', tech: 'solar', capacityKw: 'lots' },
    },
  ],
};

beforeEach(() => {
  setMastrCleanedOverride(null);
  useMastrStore.setState({ plants: null, status: 'idle' });
});

afterEach(() => {
  setMastrCleanedOverride(null);
});

describe('parseMastrFeatureCollection', () => {
  it('keeps only valid Point features with known tech and positive capacity', () => {
    const plants = parseMastrFeatureCollection(SAMPLE);
    expect(plants).toHaveLength(2);
    expect(plants?.[0]?.tech).toBe('solar');
    expect(plants?.[1]?.tech).toBe('wind');
  });

  it('rejects malformed payloads', () => {
    expect(parseMastrFeatureCollection(null)).toBeNull();
    expect(parseMastrFeatureCollection({})).toBeNull();
    expect(
      parseMastrFeatureCollection({ type: 'FeatureCollection', features: [] }),
    ).toBeNull();
  });

  it('falls back to current year when commissioningYear is missing', () => {
    const plants = parseMastrFeatureCollection({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [10, 50] },
          properties: { id: 'X', tech: 'solar', capacityKw: 5 },
        },
      ],
    });
    expect(plants?.[0]?.commissioningYear).toBe(new Date().getUTCFullYear());
  });
});

describe('loadMastr', () => {
  it('marks loaded and applies override on success', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(SAMPLE), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;
    const plants = await loadMastr('/data/mastr-clean.geojson', fetcher);
    expect(plants).not.toBeNull();
    expect(useMastrStore.getState().status).toBe('loaded');
  });

  it('marks missing on 404', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    const plants = await loadMastr('/data/mastr-clean.geojson', fetcher);
    expect(plants).toBeNull();
    expect(useMastrStore.getState().status).toBe('missing');
  });

  it('marks missing on network error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const plants = await loadMastr('/data/mastr-clean.geojson', fetcher);
    expect(plants).toBeNull();
    expect(useMastrStore.getState().status).toBe('missing');
  });
});
