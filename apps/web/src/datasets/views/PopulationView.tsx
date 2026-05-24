import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GeoJsonLayer } from 'deck.gl';
import {
  BUNDESLAENDER,
  bundeslandFeature,
  type BundeslandGeometry,
} from '../../data/bundeslaender';
import {
  POPULATION_FIRST_YEAR,
  POPULATION_LAST_YEAR,
  getPopulation,
  growthVsBaseline,
  nationalSeries,
  populationAt,
} from '../../data/population';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { useBoundariesStore } from '../../state/boundariesStore';
import {
  DIVERGING_RED_BLUE_STOPS,
  makeDivergingScale,
  type RGB,
} from '../../layers/colorScale';
import ColorScaleLegend from '../../components/ColorScaleLegend';
import EChart, { type EChartOption } from '../../components/EChart';

interface FeatureWithGrowth {
  type: 'Feature';
  properties: { code: string; growth: number };
  geometry: BundeslandGeometry;
}

function formatPercent(v: number, locale: string): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v)} %`;
}

function PopulationView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const time = useAppStore((s) => s.time);
  const setTime = useAppStore((s) => s.setTime);

  const yearCandidate = typeof time === 'number' ? Math.round(time) : POPULATION_LAST_YEAR - 5;
  const year = Math.max(POPULATION_FIRST_YEAR, Math.min(POPULATION_LAST_YEAR, yearCandidate));
  const boundaryOverrides = useBoundariesStore((s) => s.overrides);

  const data = useMemo(() => getPopulation(), []);
  const growth = useMemo(() => growthVsBaseline(data, year), [data, year]);
  const populations = useMemo(() => populationAt(data, year), [data, year]);
  const national = useMemo(() => nationalSeries(data), [data]);

  const maxAbs = useMemo(() => {
    let m = 0;
    for (const v of growth.values()) if (Math.abs(v) > m) m = Math.abs(v);
    return Math.max(1, Math.ceil(m));
  }, [growth]);

  useEffect(() => {
    const features: FeatureWithGrowth[] = BUNDESLAENDER.map((b) => {
      const base = bundeslandFeature(b);
      return {
        type: 'Feature',
        properties: { code: b.code, growth: growth.get(b.code) ?? 0 },
        geometry: base.geometry,
      };
    });
    const scale = makeDivergingScale(DIVERGING_RED_BLUE_STOPS, maxAbs);
    const layer = new GeoJsonLayer<{ code: string; growth: number }>({
      id: `population-${year}`,
      data: { type: 'FeatureCollection', features },
      pickable: true,
      filled: true,
      stroked: true,
      opacity: 0.85,
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 1,
      getLineWidth: 1,
      getFillColor: (f): RGB =>
        scale((f.properties as { growth: number }).growth),
      getLineColor: [15, 23, 42, 220],
    });
    useLayersStore.getState().setLayers([layer]);
    return () => useLayersStore.getState().clear();
  }, [growth, maxAbs, year, boundaryOverrides]);

  const nationalNow = national[year - POPULATION_FIRST_YEAR] ?? 0;
  const nationalBase = national[0] ?? 0;
  const nationalChange =
    nationalBase > 0 ? ((nationalNow - nationalBase) / nationalBase) * 100 : 0;

  const ranking = useMemo(() => {
    const list = BUNDESLAENDER.map((b) => ({
      code: b.code,
      name: locale === 'de-DE' ? b.nameDe : b.nameEn,
      growth: growth.get(b.code) ?? 0,
      pop: populations.get(b.code) ?? 0,
    }));
    list.sort((a, b) => b.growth - a.growth);
    return list;
  }, [growth, populations, locale]);

  const top = ranking[0];
  const bottom = ranking[ranking.length - 1];

  const nationalSeriesPoints = useMemo(
    () => data.years.map((y, i) => [y, Math.round((national[i] ?? 0) / 1000)] as [number, number]),
    [data, national],
  );

  const chartOption: EChartOption = useMemo(
    () => ({
      animation: false,
      grid: { left: 40, right: 16, top: 10, bottom: 24 },
      xAxis: { type: 'value', min: POPULATION_FIRST_YEAR, max: POPULATION_LAST_YEAR, axisLabel: { fontSize: 10, formatter: (v: number) => String(Math.round(v)) } },
      yAxis: {
        type: 'value',
        name: 'Mio.',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: number | string) =>
          `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Number(v))} Mio.`,
      },
      series: [
        {
          type: 'line',
          showSymbol: false,
          data: nationalSeriesPoints,
          lineStyle: { color: '#3b82f6', width: 2 },
          areaStyle: { color: 'rgba(59,130,246,0.18)' },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ xAxis: year }],
            lineStyle: { color: '#f59e0b', width: 1, type: 'dashed' },
          },
        },
      ],
    }),
    [nationalSeriesPoints, year, locale],
  );

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.population')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('population.description')}</p>

        <label className="mt-3 block">
          <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>{t('population.year')}</span>
            <span className="font-mono tabular-nums">{year}</span>
          </div>
          <input
            type="range"
            min={POPULATION_FIRST_YEAR}
            max={POPULATION_LAST_YEAR}
            step={1}
            value={year}
            onChange={(e) => setTime(Number(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-500 dark:bg-slate-700"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>{POPULATION_FIRST_YEAR}</span>
            <span>{POPULATION_LAST_YEAR}</span>
          </div>
        </label>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('population.national')}
            </dt>
            <dd className="font-semibold">
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(nationalNow / 1000)} Mio.
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('population.vsBaseline')}
            </dt>
            <dd
              className={
                'font-semibold ' +
                (nationalChange >= 0
                  ? 'text-blue-600 dark:text-blue-300'
                  : 'text-rose-600 dark:text-rose-300')
              }
            >
              {formatPercent(nationalChange, locale)}
            </dd>
          </div>
        </dl>

        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('population.profile')}
          </div>
          <EChart option={chartOption} height={130} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          {top && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-300">
                ↑ {t('population.fastestGrowth')}
              </div>
              <div className="font-semibold">{top.name}</div>
              <div className="text-blue-600 dark:text-blue-300">{formatPercent(top.growth, locale)}</div>
            </div>
          )}
          {bottom && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-300">
                ↓ {t('population.fastestDecline')}
              </div>
              <div className="font-semibold">{bottom.name}</div>
              <div className="text-rose-600 dark:text-rose-300">
                {formatPercent(bottom.growth, locale)}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('population.mockNotice')}
        </p>
      </div>
      <ColorScaleLegend
        title={t('population.legendTitle')}
        unit="%"
        domain={[-maxAbs, maxAbs]}
        stops={DIVERGING_RED_BLUE_STOPS}
        formatValue={(v) => formatPercent(v, locale)}
        ticks={5}
      />
    </>
  );
}

export default PopulationView;
