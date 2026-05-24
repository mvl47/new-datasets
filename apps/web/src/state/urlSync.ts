import type { Bbox, FilterValue, FiltersState } from './appStore';
import { useAppStore } from './appStore';

interface HashState {
  bbox?: Bbox;
  time?: number | null;
  filters?: FiltersState;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBbox(value: unknown): value is Bbox {
  return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber);
}

function isFilterValue(value: unknown): value is FilterValue {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isFilters(value: unknown): value is FiltersState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isFilterValue);
}

function parseHash(hash: string): HashState {
  if (!hash || hash === '#') return {};
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    const decoded = decodeURIComponent(stripped);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const candidate = parsed as Record<string, unknown>;
    const out: HashState = {};
    if (isBbox(candidate.bbox)) out.bbox = candidate.bbox;
    if (candidate.time === null || isFiniteNumber(candidate.time)) out.time = candidate.time;
    if (isFilters(candidate.filters)) out.filters = candidate.filters;
    return out;
  } catch {
    return {};
  }
}

function serializeHash(state: HashState): string {
  return '#' + encodeURIComponent(JSON.stringify(state));
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function hydrateAppStateFromHash(): void {
  const next = parseHash(window.location.hash);
  const store = useAppStore.getState();
  if (next.bbox) store.setBbox(next.bbox);
  if (next.time !== undefined) store.setTime(next.time);
  if (next.filters) store.setFilters(next.filters);
}

export function installUrlSync(): () => void {
  const unsub = useAppStore.subscribe((state, prev) => {
    if (state.bbox === prev.bbox && state.time === prev.time && state.filters === prev.filters) {
      return;
    }
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      const next = serializeHash({
        bbox: state.bbox,
        time: state.time,
        filters: state.filters,
      });
      if (window.location.hash !== next) {
        window.history.replaceState(null, '', next);
      }
    }, 250);
  });

  return () => {
    unsub();
    if (writeTimer) clearTimeout(writeTimer);
  };
}
