import type { Layer } from '@deck.gl/core';
import type { DatasetSlug } from '../data/datasets';

export interface LayerFactoryInput {
  slug: DatasetSlug;
}

export type LayerFactory = (input: LayerFactoryInput) => readonly Layer[];

export const emptyLayerFactory: LayerFactory = () => [];
