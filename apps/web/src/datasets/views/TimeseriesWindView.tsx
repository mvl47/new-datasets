import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HOURS_IN_YEAR, dateLabel, hourToDate } from '../../data/timeseriesPv';
import {
  WIND_KINDS,
  getTimeseriesWind,
  isWindKind,
  nationalSeries,
  peakOfSeries,
  windValuesAtHour,
  type WindKind,
} from '../../data/timeseriesWind';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { useBoundariesStore } from '../../state/boundariesStore';
import { useTimeseriesStore } from '../../state/timeseriesStore';
import { buildChoroplethLayer } from '../../layers/choropleth';
import { BLUES_STOPS } from '../../layers/colorScale';
import EChart, { type EChartOption } from '../../components/EChart';
import ColorScaleLegend from '../../components/ColorScaleLegend';

function formatNumber(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function TimeseriesWindView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const time = useAppStore((s) => s.time);
  const setTime = useAppStore((s) => s.setTime);
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const kind: WindKind = isWindKind(filters.windKind) ? filters.windKind : 'onshore';
  const hour = typeof time === 'number' && time >= 0 && time < HOURS_IN_YEAR ? Math.floor(time) : 4380;
  const boundaryOverrides = useBoundariesStore((s) => s.overrides);
  const windOnshoreStatus = useTimeseriesStore((s) => s.windOnshoreStatus);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => getTimeseriesWind(), [windOnshoreStatus]);
  const currentValues = useMemo(() => windValuesAtHour(data, kind, hour), [data, kind, hour]);
  const national = useMemo(() => nationalSeries(data, kind), [data, kind]);
  const peak = useMemo(() => peakOfSeries(national), [national]);

  const peakDomain: [number, number] = useMemo(() => {
    const target = kind === 'onshore' ? data.onshore.byBundesland : data.offshore.byBundesland;
    let max = 0;
    for (const series of Object.values(target)) {
      if (!series) continue;
      for (let i = 0; i < series.length; i++) if ((series[i] ?? 0) > max) max = series[i] ?? 0;
    }
    return [0, Math.max(1, max)];
  }, [data, kind]);

  useEffect(() => {
    const layer = buildChoroplethLayer({
      id: `timeseries-wind-${kind}-${hour}`,
      values: currentValues,
      stops: BLUES_STOPS,
      domain: peakDomain,
    });
    useLayersStore.getState().setLayers([layer]);
    return () => useLayersStore.getState().clear();
  }, [currentValues, peakDomain, kind, hour, boundaryOverrides]);

  const seriesPoints = useMemo(() => {
    const pts = new Array<[number, number]>(national.length);
    for (let i = 0; i < national.length; i++) {
      pts[i] = [hourToDate(i).getTime(), Math.round(national[i] ?? 0)];
    }
    return pts;
  }, [national]);

  const chartOption: EChartOption = useMemo(
    () => ({
      animation: false,
      grid: { left: 40, right: 16, top: 10, bottom: 32 },
      xAxis: { type: 'time', axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'value',
        name: 'MW',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: number | string) =>
          `${new Intl.NumberFormat(locale).format(Math.round(Number(v)))} MW`,
      },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 6 }],
      series: [
        {
          type: 'line',
          data: seriesPoints,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { color: '#0ea5e9', width: 1 },
          areaStyle: { color: 'rgba(14,165,233,0.18)' },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ xAxis: hourToDate(hour).getTime() }],
            lineStyle: { color: '#f59e0b', width: 1, type: 'dashed' },
          },
        },
      ],
    }),
    [seriesPoints, hour, locale],
  );

  const currentMw = national[hour] ?? 0;
  const installedSum = useMemo(() => {
    if (kind === 'onshore') {
      return Object.values(data.onshore.capacities).reduce((s, v) => s + v, 0);
    }
    return Object.values(data.offshore.capacities).reduce((s, v) => s + (v ?? 0), 0);
  }, [data, kind]);

  const cfNow = installedSum > 0 ? (currentMw / installedSum) * 100 : 0;

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.timeseriesWind')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('tsWind.description')}</p>

        <div className="mt-3 inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
          {WIND_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => patchFilters({ windKind: k })}
              className={[
                'rounded px-3 py-1 text-xs transition-colors',
                kind === k
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {t(`tsWind.kind.${k}`)}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>{t('tsWind.hour')}</span>
            <span className="font-mono tabular-nums">{dateLabel(hour, locale)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={HOURS_IN_YEAR - 1}
            step={1}
            value={hour}
            onChange={(e) => setTime(Number(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500 dark:bg-slate-700"
          />
        </label>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('tsWind.now')}
            </dt>
            <dd className="font-semibold">{formatNumber(currentMw, locale)} MW</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('tsWind.cf')}
            </dt>
            <dd className="font-semibold">{cfNow.toFixed(0)} %</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('tsWind.peak')}
            </dt>
            <dd className="font-semibold">{formatNumber(peak.mw, locale)} MW</dd>
          </div>
        </dl>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          {t('tsWind.peakAt')}: {dateLabel(peak.hour, locale)}
        </p>

        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('tsWind.profile')}
          </div>
          <EChart option={chartOption} height={150} />
        </div>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {kind === 'onshore' && windOnshoreStatus === 'loaded'
            ? t('tsWind.realNotice')
            : t('tsWind.mockNotice')}
        </p>
      </div>
      <ColorScaleLegend
        title={t('tsWind.legendTitle')}
        unit="MW"
        domain={peakDomain}
        stops={BLUES_STOPS}
        formatValue={(v) => formatNumber(v, locale)}
      />
    </>
  );
}

export default TimeseriesWindView;
