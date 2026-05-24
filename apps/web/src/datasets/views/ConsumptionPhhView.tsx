import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HeatmapLayer } from 'deck.gl';
import type { Layer } from '@deck.gl/core';
import { BUNDESLAENDER, type BundeslandCode } from '../../data/bundeslaender';
import {
  PHH_RESOLUTIONS,
  getPhhData,
  isPhhResolution,
  type PhhPoint,
  type PhhResolution,
} from '../../data/consumptionPhh';
import { domainFor } from '../../data/consumptionIndustry';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { useBoundariesStore } from '../../state/boundariesStore';
import { buildChoroplethLayer } from '../../layers/choropleth';
import { BLUES_STOPS } from '../../layers/colorScale';
import ColorScaleLegend from '../../components/ColorScaleLegend';

const HEATMAP_COLOR_RANGE: Array<[number, number, number, number]> = [
  [239, 243, 255, 0],
  [189, 215, 231, 160],
  [107, 174, 214, 200],
  [49, 130, 189, 220],
  [8, 81, 156, 240],
];

function formatGwh(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function ConsumptionPhhView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const resolution: PhhResolution = isPhhResolution(filters.phhResolution)
    ? filters.phhResolution
    : 'bundesland';
  const boundaryOverrides = useBoundariesStore((s) => s.overrides);

  const { perBundesland, points } = useMemo(() => getPhhData(), []);
  const domain = useMemo(() => domainFor(perBundesland), [perBundesland]);

  useEffect(() => {
    const layers: Layer[] = [];
    if (resolution === 'bundesland') {
      layers.push(
        buildChoroplethLayer({
          id: 'consumption-phh-choropleth',
          values: perBundesland,
          stops: BLUES_STOPS,
          domain,
        }),
      );
    } else {
      layers.push(
        new HeatmapLayer<PhhPoint>({
          id: 'consumption-phh-heatmap',
          data: points as PhhPoint[],
          getPosition: (d) => [d.lon, d.lat],
          getWeight: (d) => d.weight,
          aggregation: 'SUM',
          radiusPixels: 28,
          intensity: 1,
          threshold: 0.04,
          colorRange: HEATMAP_COLOR_RANGE,
        }),
      );
    }
    useLayersStore.getState().setLayers(layers);
    return () => useLayersStore.getState().clear();
  }, [resolution, perBundesland, domain, points, boundaryOverrides]);

  const total = useMemo(() => {
    let s = 0;
    for (const v of perBundesland.values()) s += v;
    return s;
  }, [perBundesland]);

  const topThree = useMemo(() => {
    const list = BUNDESLAENDER.map((b) => ({
      code: b.code as BundeslandCode,
      name: locale === 'de-DE' ? b.nameDe : b.nameEn,
      value: perBundesland.get(b.code) ?? 0,
    }));
    list.sort((a, b) => b.value - a.value);
    return list.slice(0, 3);
  }, [perBundesland, locale]);

  const setResolution = (next: PhhResolution) => patchFilters({ phhResolution: next });

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.consumptionPhh')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('phh.description')}</p>

        <div className="mt-4 inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
          {PHH_RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResolution(r)}
              className={[
                'rounded px-3 py-1 text-xs transition-colors',
                resolution === r
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {t(`phh.resolution.${r}`)}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('phh.totalLabel')}
            </div>
            <div className="font-semibold">{formatGwh(total, locale)} GWh</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('phh.perCapita')}
            </div>
            <div className="font-semibold">1.450 kWh</div>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('phh.topThree')}
          </div>
          <ul className="mt-1 text-xs">
            {topThree.map((e) => (
              <li key={e.code} className="flex justify-between">
                <span>{e.name}</span>
                <span className="tabular-nums">{formatGwh(e.value, locale)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('phh.rasterNotice')}
        </p>
      </div>
      {resolution === 'bundesland' && (
        <ColorScaleLegend
          title={t('phh.legendTitle')}
          unit="GWh"
          domain={domain}
          stops={BLUES_STOPS}
          formatValue={(v) => formatGwh(v, locale)}
        />
      )}
    </>
  );
}

export default ConsumptionPhhView;
