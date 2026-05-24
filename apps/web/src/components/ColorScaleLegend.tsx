import { sampleScale, rgbToCss, type ColorStop } from '../layers/colorScale';

interface Props {
  title: string;
  unit?: string;
  domain: [number, number];
  stops: ReadonlyArray<ColorStop>;
  formatValue?: (value: number) => string;
  ticks?: number;
}

function defaultFormat(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(value));
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function ColorScaleLegend({ title, unit, domain, stops, formatValue = defaultFormat, ticks = 5 }: Props) {
  const [lo, hi] = domain;
  const samples = Array.from({ length: 32 }, (_, i) => i / 31);
  const gradient = samples
    .map((t) => `${rgbToCss(sampleScale(stops, t))} ${(t * 100).toFixed(1)}%`)
    .join(', ');

  const tickValues = Array.from({ length: ticks }, (_, i) =>
    lo + ((hi - lo) * i) / (ticks - 1),
  );

  return (
    <div className="pointer-events-auto absolute bottom-8 right-4 w-52 rounded-md bg-white/95 px-3 py-2 text-xs shadow-md ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <div className="mb-1 font-semibold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
        {title}
        {unit && <span className="ml-1 lowercase font-normal">[{unit}]</span>}
      </div>
      <div
        className="h-2 w-full rounded-sm"
        style={{ background: `linear-gradient(to right, ${gradient})` }}
        aria-hidden="true"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
        {tickValues.map((v, i) => (
          <span key={i}>{formatValue(v)}</span>
        ))}
      </div>
    </div>
  );
}

export default ColorScaleLegend;
