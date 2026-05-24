import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BUNDESLAENDER, type BundeslandCode } from '../../data/bundeslaender';
import {
  WEATHER_METRICS,
  getWeather,
  isWeatherMetric,
  valuesForMetric,
  type WeatherMetric,
} from '../../data/weather';
import { domainFor } from '../../data/consumptionIndustry';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { useBoundariesStore } from '../../state/boundariesStore';
import { buildChoroplethLayer } from '../../layers/choropleth';
import { BLUES_STOPS, ORANGES_STOPS } from '../../layers/colorScale';
import ColorScaleLegend from '../../components/ColorScaleLegend';
import EChart, { type EChartOption } from '../../components/EChart';

function isBundeslandCode(value: unknown): value is BundeslandCode {
  return typeof value === 'string' && BUNDESLAENDER.some((b) => b.code === value);
}

function WeatherView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const metric: WeatherMetric = isWeatherMetric(filters.weatherMetric)
    ? filters.weatherMetric
    : 'temperature';
  const selected: BundeslandCode | null = isBundeslandCode(filters.weatherSelected)
    ? filters.weatherSelected
    : null;
  const boundaryOverrides = useBoundariesStore((s) => s.overrides);

  const climate = useMemo(() => getWeather(), []);
  const values = useMemo(() => valuesForMetric(climate, metric), [climate, metric]);
  const domain = useMemo(() => domainFor(values), [values]);

  const stops = metric === 'temperature' ? ORANGES_STOPS : BLUES_STOPS;

  useEffect(() => {
    const layer = buildChoroplethLayer({
      id: `weather-${metric}`,
      values,
      stops,
      domain,
      highlightedCode: selected,
      onSelect: (code) => patchFilters({ weatherSelected: code }),
    });
    useLayersStore.getState().setLayers([layer]);
    return () => useLayersStore.getState().clear();
  }, [metric, values, domain, stops, selected, patchFilters, boundaryOverrides]);

  const activeCode: BundeslandCode = selected ?? 'BY';
  const activeMeta = BUNDESLAENDER.find((b) => b.code === activeCode);
  const activeClimate = climate[activeCode];

  const monthLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2024, m, 1)));
  }, [locale]);

  const climateOption: EChartOption = useMemo(
    () => ({
      animation: false,
      grid: { left: 36, right: 36, top: 10, bottom: 22 },
      xAxis: { type: 'category', data: monthLabels, axisLabel: { fontSize: 9 } },
      yAxis: [
        {
          type: 'value',
          name: '°C',
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
        },
        {
          type: 'value',
          name: 'mm',
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      tooltip: { trigger: 'axis' },
      series: [
        {
          name: t('weather.precipitation'),
          type: 'bar',
          yAxisIndex: 1,
          data: activeClimate.monthly.map((c) => c.precipMm),
          itemStyle: { color: '#3b82f6', opacity: 0.7 },
          barWidth: '70%',
        },
        {
          name: t('weather.temperature'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: activeClimate.monthly.map((c) => c.tempC),
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
        },
      ],
    }),
    [activeClimate, monthLabels, t],
  );

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.weather')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('weather.description')}</p>

        <div className="mt-3 inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
          {WEATHER_METRICS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => patchFilters({ weatherMetric: m })}
              className={[
                'rounded px-3 py-1 text-xs transition-colors',
                metric === m
                  ? m === 'temperature'
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {t(`weather.${m}`)}
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('weather.climograph')}
            </span>
            <select
              value={activeCode}
              onChange={(e) => patchFilters({ weatherSelected: e.target.value })}
              className="ml-2 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              {BUNDESLAENDER.map((b) => (
                <option key={b.code} value={b.code}>
                  {locale === 'de-DE' ? b.nameDe : b.nameEn}
                </option>
              ))}
            </select>
          </div>
          <EChart option={climateOption} height={170} />
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {t('weather.clickHint')}
          </p>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('weather.annualMean')}
            </dt>
            <dd className="font-semibold">
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(activeClimate.meanTempC)}
              {' °C'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('weather.annualPrecip')}
            </dt>
            <dd className="font-semibold">
              {new Intl.NumberFormat(locale).format(activeClimate.annualPrecipMm)} mm
            </dd>
          </div>
        </dl>

        {activeMeta && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {locale === 'de-DE' ? activeMeta.nameDe : activeMeta.nameEn}
          </p>
        )}

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('weather.mockNotice')}
        </p>
      </div>
      <ColorScaleLegend
        title={t(`weather.legend.${metric}`)}
        unit={metric === 'temperature' ? '°C' : 'mm/a'}
        domain={domain}
        stops={stops}
        formatValue={(v) =>
          new Intl.NumberFormat(locale, {
            maximumFractionDigits: metric === 'temperature' ? 1 : 0,
          }).format(v)
        }
      />
    </>
  );
}

export default WeatherView;
