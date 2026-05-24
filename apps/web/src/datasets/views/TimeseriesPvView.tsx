import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BUNDESLAENDER } from '../../data/bundeslaender';
import {
  HOURS_IN_YEAR,
  annualYieldGwh,
  dateLabel,
  getTimeseriesPv,
  hourToDate,
  valuesAtHour,
} from '../../data/timeseriesPv';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { buildChoroplethLayer } from '../../layers/choropleth';
import { ORANGES_STOPS } from '../../layers/colorScale';
import EChart, { type EChartOption } from '../../components/EChart';
import ColorScaleLegend from '../../components/ColorScaleLegend';

function formatNumber(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function TimeseriesPvView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const time = useAppStore((s) => s.time);
  const setTime = useAppStore((s) => s.setTime);

  const hour = typeof time === 'number' && time >= 0 && time < HOURS_IN_YEAR ? Math.floor(time) : 4380;
  const data = useMemo(() => getTimeseriesPv(), []);
  const currentValues = useMemo(() => valuesAtHour(data, hour), [data, hour]);
  const annual = useMemo(() => annualYieldGwh(data), [data]);
  const currentDomain = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of currentValues.values()) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo)) return [0, 1] as [number, number];
    return [lo, Math.max(hi, lo + 1)] as [number, number];
  }, [currentValues]);

  const peakDomain = useMemo(() => {
    let peak = 0;
    for (const series of Object.values(data.byBundesland)) {
      for (let i = 0; i < series.length; i++) if (series[i]! > peak) peak = series[i]!;
    }
    return [0, peak] as [number, number];
  }, [data]);

  useEffect(() => {
    const layer = buildChoroplethLayer({
      id: `timeseries-pv-hour-${hour}`,
      values: currentValues,
      stops: ORANGES_STOPS,
      domain: peakDomain,
    });
    useLayersStore.getState().setLayers([layer]);
    return () => useLayersStore.getState().clear();
  }, [currentValues, peakDomain, hour]);

  const nationalSeries = useMemo(() => {
    const series = data.national;
    const points = new Array<[number, number]>(series.length);
    for (let i = 0; i < series.length; i++) {
      points[i] = [hourToDate(i).getTime(), Math.round(series[i] ?? 0)];
    }
    return points;
  }, [data]);

  const peakNational = useMemo(() => {
    let p = 0;
    let pi = 0;
    for (let i = 0; i < data.national.length; i++) {
      if (data.national[i]! > p) {
        p = data.national[i]!;
        pi = i;
      }
    }
    return { mw: p, hour: pi };
  }, [data]);

  const currentNationalMw = data.national[hour] ?? 0;

  const chartOption: EChartOption = useMemo(
    () => ({
      animation: false,
      grid: { left: 40, right: 16, top: 10, bottom: 32 },
      xAxis: {
        type: 'time',
        axisLabel: { fontSize: 10 },
      },
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
          data: nationalSeries,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { color: '#f59e0b', width: 1 },
          areaStyle: { color: 'rgba(245,158,11,0.18)' },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ xAxis: hourToDate(hour).getTime() }],
            lineStyle: { color: '#0ea5e9', width: 1, type: 'dashed' },
          },
        },
      ],
    }),
    [nationalSeries, hour, locale],
  );

  const topAnnual = useMemo(() => {
    const list = BUNDESLAENDER.map((b) => ({
      code: b.code,
      name: locale === 'de-DE' ? b.nameDe : b.nameEn,
      gwh: annual.get(b.code) ?? 0,
    }));
    list.sort((a, b) => b.gwh - a.gwh);
    return list.slice(0, 3);
  }, [annual, locale]);

  const peakHourLabel = dateLabel(peakNational.hour, locale);
  const currentLabel = dateLabel(hour, locale);

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.timeseriesPv')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('tsPv.description')}</p>

        <label className="mt-3 block">
          <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>{t('tsPv.hour')}</span>
            <span className="font-mono tabular-nums">{currentLabel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={HOURS_IN_YEAR - 1}
            step={1}
            value={hour}
            onChange={(e) => setTime(Number(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
          />
        </label>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('tsPv.nowNational')}
            </dt>
            <dd className="font-semibold">{formatNumber(currentNationalMw, locale)} MW</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('tsPv.peak')}
            </dt>
            <dd className="font-semibold">{formatNumber(peakNational.mw, locale)} MW</dd>
            <dd className="text-[10px] text-slate-500 dark:text-slate-400">{peakHourLabel}</dd>
          </div>
        </dl>

        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('tsPv.nationalProfile')}
          </div>
          <EChart option={chartOption} height={150} />
        </div>

        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('tsPv.annual')}
          </div>
          <ul className="mt-1 text-xs">
            {topAnnual.map((e) => (
              <li key={e.code} className="flex justify-between">
                <span>{e.name}</span>
                <span className="tabular-nums">{formatNumber(e.gwh, locale)} GWh</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('tsPv.mockNotice')}
        </p>
      </div>
      <ColorScaleLegend
        title={t('tsPv.legendTitle')}
        unit="MW"
        domain={currentDomain}
        stops={ORANGES_STOPS}
        formatValue={(v) => formatNumber(v, locale)}
      />
    </>
  );
}

export default TimeseriesPvView;
