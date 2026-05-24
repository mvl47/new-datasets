import { create } from 'zustand';
import type { Layer } from '@deck.gl/core';

export interface LayersState {
  layers: readonly Layer[];
  setLayers: (layers: readonly Layer[]) => void;
  clear: () => void;
}

export const useLayersStore = create<LayersState>((set) => ({
  layers: [],
  setLayers: (layers) => set({ layers }),
  clear: () => set({ layers: [] }),
}));
