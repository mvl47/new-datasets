import { describe, it, expect } from 'vitest';
import { emptyLayerFactory } from './index';

describe('emptyLayerFactory', () => {
  it('returns no layers regardless of slug', () => {
    expect(emptyLayerFactory({ slug: 'mastr-clean' })).toHaveLength(0);
    expect(emptyLayerFactory({ slug: 'weather' })).toHaveLength(0);
  });
});
