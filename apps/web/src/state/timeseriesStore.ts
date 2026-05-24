import { create } from 'zustand';

export type TimeseriesStatus = 'idle' | 'loading' | 'loaded' | 'missing';

export interface TimeseriesStoreState {
  pvStatus: TimeseriesStatus;
  windOnshoreStatus: TimeseriesStatus;
  setPvStatus: (status: TimeseriesStatus) => void;
  setWindOnshoreStatus: (status: TimeseriesStatus) => void;
}

export const useTimeseriesStore = create<TimeseriesStoreState>((set) => ({
  pvStatus: 'idle',
  windOnshoreStatus: 'idle',
  setPvStatus: (status) => set({ pvStatus: status }),
  setWindOnshoreStatus: (status) => set({ windOnshoreStatus: status }),
}));
