import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PolygonLayer, ScatterplotLayer } from 'deck.gl';
import type { Layer } from '@deck.gl/core';
import {
  aggregateWind,
  getWindOnshore,
  type WindArea,
  type WindTurbine,
} from '../../data/potentialWindOnshore';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { makeLinearScale, BLUES_STOPS, type RGB } from '../../layers/colorScale';
import { renderTooltip } from '../../layers/tooltip';

const VIEW_MODES = ['areas', 'turbines', 'both'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

function isViewMode(v: unknown): v is ViewMode {
  return v === 'areas' || v === 'turbines' || v === 'both';
}

function formatNumber(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function formatMs(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v);
}

function PotentialWindOnshoreView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const viewMode: ViewMode = isViewMode(filters.windOnshoreView) ? filters.windOnshoreView : 'both';

  const { areas, turbines } = useMemo(() => getWindOnshore(), []);
  const aggregate = useMemo(() => aggregateWind(areas), [areas]);

  const maxCap = useMemo(() => {
    let m = 0;
    for (const a of areas) if (a.capacityMw > m) m = a.capacityMw;
    return m;
  }, [areas]);

  const colorScale = useMemo(
    () => makeLinearScale(BLUES_STOPS, [0, Math.max(1, maxCap)]),
    [maxCap],
  );

  useEffect(() => {
    const layers: Layer[] = [];
    if (viewMode === 'areas' || viewMode === 'both') {
      layers.push(
        new PolygonLayer<WindArea>({
          id: 'wind-onshore-areas',
          data: areas as WindArea[],
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          lineWidthMinPixels: 0.5,
          getPolygon: (d) => d.polygon,
          getFillColor: (d): RGB => colorScale(d.capacityMw),
          getLineColor: [8, 47, 73, 220],
          opacity: 0.7,
        }),
      );
    }
    if (viewMode === 'turbines' || viewMode === 'both') {
      layers.push(
        new ScatterplotLayer<WindTurbine>({
          id: 'wind-onshore-turbines',
          data: turbines as WindTurbine[],
          pickable: true,
          stroked: true,
          filled: true,
          radiusUnits: 'pixels',
          radiusMinPixels: 2,
          radiusMaxPixels: 6,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: (d) => Math.max(2, Math.min(6, d.capacityKw / 1000)),
          getFillColor: [253, 224, 71],
          getLineColor: [120, 53, 15],
          lineWidthMinPixels: 0.3,
          opacity: 0.95,
        }),
      );
    }
    useLayersStore.getState().setLayers(layers, (info) => {
      if (!info.object) return null;
      const layerId = info.layer?.id ?? '';
      if (layerId.includes('areas')) {
        const a = info.object as { id: string; capacityMw: number; areaKm2: number; meanWindMs: number };
        return renderTooltip(`Wind · ${a.id}`, [
          { label: t('windOn.capacity'), value: `${formatNumber(a.capacityMw, locale)} MW` },
          { label: t('windOn.area'), value: `${formatNumber(a.areaKm2, locale)} km²` },
          { label: t('windOn.meanWind'), value: `${formatMs(a.meanWindMs, locale)} m/s` },
        ]);
      }
      const t2 = info.object as { id: string; capacityKw: number; hubHeightM: number };
      return renderTooltip(t2.id, [
        { label: t('windOn.capacity'), value: `${formatNumber(t2.capacityKw, locale)} kW` },
        { label: t('windOn.hubHeight'), value: `${formatNumber(t2.hubHeightM, locale)} m` },
      ]);
    });
    return () => useLayersStore.getState().clear();
  }, [areas, turbines, viewMode, colorScale, locale, t]);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('view.datasetName')}
      </p>
      <h2 className="text-base font-semibold">{t('datasets.potentialWindOnshore')}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('windOn.description')}</p>

      <div className="mt-3 inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
        {VIEW_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => patchFilters({ windOnshoreView: m })}
            className={[
              'rounded px-3 py-1 text-xs transition-colors',
              viewMode === m
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {t(`windOn.view.${m}`)}
          </button>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('windOn.areas')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.count, locale)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('windOn.capacity')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.totalCapacityMw, locale)} MW</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('windOn.area')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.totalAreaKm2, locale)} km²</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('windOn.meanWind')}
          </dt>
          <dd className="font-semibold">{formatMs(aggregate.meanWindMs, locale)} m/s</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">{t('windOn.turbines')}</span>
          <span className="font-mono tabular-nums">{formatNumber(turbines.length, locale)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-300 ring-1 ring-amber-700/40" />
          <span>{t('windOn.wistlNote')}</span>
        </div>
      </div>

      <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
        {t('windOn.mockNotice')}
      </p>
    </div>
  );
}

export default PotentialWindOnshoreView;
