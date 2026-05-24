import { describe, expect, it } from 'vitest';
import { makeLinearScale, sampleScale, VIRIDIS_STOPS } from './colorScale';

describe('colorScale', () => {
  it('samples interior of viridis between purple and yellow', () => {
    expect(sampleScale(VIRIDIS_STOPS, 0)).toEqual([68, 1, 84]);
    expect(sampleScale(VIRIDIS_STOPS, 1)).toEqual([253, 231, 37]);
    const mid = sampleScale(VIRIDIS_STOPS, 0.5);
    expect(mid).toEqual([33, 144, 141]);
  });

  it('clamps values outside [0,1]', () => {
    expect(sampleScale(VIRIDIS_STOPS, -1)).toEqual([68, 1, 84]);
    expect(sampleScale(VIRIDIS_STOPS, 2)).toEqual([253, 231, 37]);
  });

  it('makeLinearScale normalises by domain', () => {
    const scale = makeLinearScale(VIRIDIS_STOPS, [100, 500]);
    expect(scale(100)).toEqual([68, 1, 84]);
    expect(scale(500)).toEqual([253, 231, 37]);
    expect(scale(300)).toEqual([33, 144, 141]);
  });

  it('makeLinearScale handles zero-span domain', () => {
    const scale = makeLinearScale(VIRIDIS_STOPS, [5, 5]);
    expect(scale(5)).toEqual([68, 1, 84]);
  });
});
