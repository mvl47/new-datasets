import { describe, it, expect } from 'vitest';
import { DATASETS, DATASET_SLUGS, findDatasetBySlug, isDatasetSlug } from './datasets';

describe('datasets', () => {
  it('exposes exactly 11 datasets', () => {
    expect(DATASETS).toHaveLength(11);
    expect(DATASET_SLUGS).toHaveLength(11);
  });

  it('all slugs are unique', () => {
    expect(new Set(DATASET_SLUGS).size).toBe(DATASET_SLUGS.length);
  });

  it('isDatasetSlug narrows known and unknown values', () => {
    expect(isDatasetSlug('mastr-clean')).toBe(true);
    expect(isDatasetSlug('weather')).toBe(true);
    expect(isDatasetSlug('does-not-exist')).toBe(false);
  });

  it('findDatasetBySlug returns the matching meta or undefined', () => {
    expect(findDatasetBySlug('weather')?.viz).toBe('choropleth');
    expect(findDatasetBySlug('potential-wind-offshore')?.viz).toBe('raster');
    expect(findDatasetBySlug('does-not-exist')).toBeUndefined();
  });
});
