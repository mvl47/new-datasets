import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HeatmapLayer, ScatterplotLayer } from 'deck.gl';
import type { Layer } from '@deck.gl/core';
import {
  aggregateOffshore,
  getOffshore,
  OFFSHORE_SEAS,
  type OffshorePark,
  type OffshorePoint,
  type OffshoreSea,
} from '../../data/potentialWindOffshore';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';

const OFFSHORE_COLOR_RANGE: Array<[number, number, number, number]> = [
  [12, 74, 110, 0],
  [3, 105, 161, 140],
  [2, 132, 199, 190],
  [56, 189, 248, 220],
  [186, 230, 253, 240],
];

const SEA_FILTERS: ReadonlyArray<'all' | OffshoreSea> = ['all', ...OFFSHORE_SEAS];
type SeaFilter = (typeof SEA_FILTERS)[number];

function isSeaFilter(v: unknown): v is SeaFilter {
  return v === 'all' || v === 'north' || v === 'baltic';
}

function formatNumber(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function PotentialWindOffshoreView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const sea: SeaFilter = isSeaFilter(filters.offshoreSea) ? filters.offshoreSea : 'all';

  const { points, parks } = useMemo(() => getOffshore(), []);
  const visiblePoints = useMemo(
    () => (sea === 'all' ? points : points.filter((p) => p.sea === sea)),
    [points, sea],
  );
  const visibleParks = useMemo(
    () => (sea === 'all' ? parks : parks.filter((p) => p.sea === sea)),
    [parks, sea],
  );
  const aggregate = useMemo(() => aggregateOffshore(visibleParks), [visibleParks]);

  useEffect(() => {
    const layers: Layer[] = [
      new HeatmapLayer<OffshorePoint>({
        id: 'wind-offshore-heatmap',
        data: visiblePoints as OffshorePoint[],
        getPosition: (d) => [d.lon, d.lat],
        getWeight: (d) => d.windScore,
        aggregation: 'MEAN',
        radiusPixels: 36,
        intensity: 1.3,
        threshold: 0.04,
        colorRange: OFFSHORE_COLOR_RANGE,
      }),
      new ScatterplotLayer<OffshorePark>({
        id: 'wind-offshore-parks',
        data: visibleParks as OffshorePark[],
        pickable: true,
        stroked: true,
        filled: true,
        radiusUnits: 'pixels',
        radiusMinPixels: 4,
        radiusMaxPixels: 12,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => Math.max(4, Math.min(12, Math.sqrt(d.capacityMw) * 0.5)),
        getFillColor: (d) =>
          d.status === 'operational' ? [253, 224, 71, 230] : [251, 113, 133, 200],
        getLineColor: [15, 23, 42, 230],
        lineWidthMinPixels: 0.5,
      }),
    ];
    useLayersStore.getState().setLayers(layers);
    return () => useLayersStore.getState().clear();
  }, [visiblePoints, visibleParks]);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('view.datasetName')}
      </p>
      <h2 className="text-base font-semibold">{t('datasets.potentialWindOffshore')}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('windOff.description')}</p>

      <div className="mt-3 inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
        {SEA_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => patchFilters({ offshoreSea: s })}
            className={[
              'rounded px-3 py-1 text-xs transition-colors',
              sea === s
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {t(`windOff.sea.${s}`)}
          </button>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('windOff.operational')}
          </dt>
          <dd className="font-semibold">
            {formatNumber(aggregate.operationalMw, locale)} MW
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
              ({aggregate.operationalCount})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('windOff.planned')}
          </dt>
          <dd className="font-semibold">
            {formatNumber(aggregate.plannedMw, locale)} MW
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
              ({aggregate.plannedCount})
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-300 ring-1 ring-amber-700/40" />
          <span>{t('windOff.legend.operational')}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400 ring-1 ring-rose-700/40" />
          <span>{t('windOff.legend.planned')}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-sm bg-gradient-to-r from-sky-900/30 via-sky-500 to-sky-200" />
          <span>{t('windOff.legend.heatmap')}</span>
        </div>
      </div>

      <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
        {t('windOff.mockNotice')}
      </p>
    </div>
  );
}

export default PotentialWindOffshoreView;
