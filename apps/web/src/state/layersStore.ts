import { create } from 'zustand';
import type { Layer, PickingInfo } from '@deck.gl/core';

export type TooltipFn = (info: PickingInfo) => { html: string } | null;

export interface LayersState {
  layers: readonly Layer[];
  getTooltip: TooltipFn | null;
  setLayers: (layers: readonly Layer[], getTooltip?: TooltipFn | null) => void;
  setTooltip: (getTooltip: TooltipFn | null) => void;
  clear: () => void;
}

export const useLayersStore = create<LayersState>((set) => ({
  layers: [],
  getTooltip: null,
  setLayers: (layers, getTooltip) =>
    set(getTooltip === undefined ? { layers } : { layers, getTooltip }),
  setTooltip: (getTooltip) => set({ getTooltip }),
  clear: () => set({ layers: [], getTooltip: null }),
}));
