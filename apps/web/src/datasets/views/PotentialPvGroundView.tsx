import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PolygonLayer } from 'deck.gl';
import type { Layer } from '@deck.gl/core';
import {
  aggregatePv,
  byBundesland,
  getPvSites,
  type PvSite,
} from '../../data/potentialPvGround';
import { BUNDESLAENDER } from '../../data/bundeslaender';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { makeLinearScale, ORANGES_STOPS, type RGB } from '../../layers/colorScale';

const VIEW_MODES = ['flat', 'extruded'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

function isViewMode(v: unknown): v is ViewMode {
  return v === 'flat' || v === 'extruded';
}

function formatNumber(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function PotentialPvGroundView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const minMwp = typeof filters.pvMinMwp === 'number' ? filters.pvMinMwp : 0;
  const viewMode: ViewMode = isViewMode(filters.pvViewMode) ? filters.pvViewMode : 'flat';

  const sites = useMemo(() => getPvSites(), []);
  const filtered = useMemo(() => sites.filter((s) => s.capacityMwp >= minMwp), [sites, minMwp]);
  const aggregate = useMemo(() => aggregatePv(filtered), [filtered]);
  const perBundesland = useMemo(() => byBundesland(filtered), [filtered]);

  const maxCapacity = useMemo(() => {
    let m = 0;
    for (const s of sites) if (s.capacityMwp > m) m = s.capacityMwp;
    return m;
  }, [sites]);

  const colorScale = useMemo(
    () => makeLinearScale(ORANGES_STOPS, [0, Math.max(1, maxCapacity)]),
    [maxCapacity],
  );

  useEffect(() => {
    const layer = new PolygonLayer<PvSite>({
      id: `pv-ground-${viewMode}`,
      data: filtered as PvSite[],
      pickable: true,
      stroked: true,
      filled: true,
      extruded: viewMode === 'extruded',
      wireframe: false,
      lineWidthMinPixels: 0.5,
      getPolygon: (d) => d.polygon,
      getFillColor: (d): RGB => colorScale(d.capacityMwp),
      getLineColor: [120, 53, 15, 220],
      getElevation: (d) => (viewMode === 'extruded' ? d.capacityMwp * 25 : 0),
      elevationScale: 1,
      opacity: viewMode === 'extruded' ? 0.9 : 0.75,
    });
    const layers: Layer[] = [layer];
    useLayersStore.getState().setLayers(layers);
    return () => useLayersStore.getState().clear();
  }, [filtered, viewMode, colorScale]);

  const topBundesland = useMemo(() => {
    let topCode: string | null = null;
    let topMwp = -1;
    for (const [code, entry] of perBundesland.entries()) {
      if (entry.capacityMwp > topMwp) {
        topMwp = entry.capacityMwp;
        topCode = code;
      }
    }
    if (!topCode) return null;
    const meta = BUNDESLAENDER.find((b) => b.code === topCode);
    if (!meta) return null;
    return { name: locale === 'de-DE' ? meta.nameDe : meta.nameEn, capacityMwp: topMwp };
  }, [perBundesland, locale]);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('view.datasetName')}
      </p>
      <h2 className="text-base font-semibold">{t('datasets.potentialPvGround')}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('pv.description')}</p>

      <div className="mt-3 inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
        {VIEW_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => patchFilters({ pvViewMode: m })}
            className={[
              'rounded px-3 py-1 text-xs transition-colors',
              viewMode === m
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {t(`pv.mode.${m}`)}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>{t('pv.minCapacity')}</span>
          <span className="font-mono tabular-nums">{formatNumber(minMwp, locale)} MWp</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.ceil(maxCapacity)}
          step={5}
          value={minMwp}
          onChange={(e) => patchFilters({ pvMinMwp: Number(e.target.value) })}
          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
        />
      </label>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('pv.sites')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.count, locale)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('pv.capacity')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.totalCapacityMwp, locale)} MWp</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('pv.yield')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.totalYieldGwh, locale)} GWh</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('pv.area')}
          </dt>
          <dd className="font-semibold">{formatNumber(aggregate.totalAreaHa, locale)} ha</dd>
        </div>
      </dl>

      {topBundesland && (
        <p className="mt-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400">{t('pv.leader')}: </span>
          <span className="font-semibold">{topBundesland.name}</span>
          <span className="ml-1 tabular-nums">
            ({formatNumber(topBundesland.capacityMwp, locale)} MWp)
          </span>
        </p>
      )}

      <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
        {t('pv.mockNotice')}
      </p>
    </div>
  );
}

export default PotentialPvGroundView;
