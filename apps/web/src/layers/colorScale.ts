export type RGB = [number, number, number];

export interface ColorStop {
  t: number;
  rgb: RGB;
}

export const VIRIDIS_STOPS: ReadonlyArray<ColorStop> = [
  { t: 0.0, rgb: [68, 1, 84] },
  { t: 0.25, rgb: [59, 82, 139] },
  { t: 0.5, rgb: [33, 144, 141] },
  { t: 0.75, rgb: [94, 201, 98] },
  { t: 1.0, rgb: [253, 231, 37] },
];

export const BLUES_STOPS: ReadonlyArray<ColorStop> = [
  { t: 0.0, rgb: [239, 243, 255] },
  { t: 0.25, rgb: [189, 215, 231] },
  { t: 0.5, rgb: [107, 174, 214] },
  { t: 0.75, rgb: [49, 130, 189] },
  { t: 1.0, rgb: [8, 81, 156] },
];

export const ORANGES_STOPS: ReadonlyArray<ColorStop> = [
  { t: 0.0, rgb: [255, 245, 235] },
  { t: 0.25, rgb: [253, 208, 162] },
  { t: 0.5, rgb: [253, 141, 60] },
  { t: 0.75, rgb: [217, 71, 1] },
  { t: 1.0, rgb: [127, 39, 4] },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

export function sampleScale(stops: ReadonlyArray<ColorStop>, t: number): RGB {
  if (stops.length === 0) return [128, 128, 128];
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i] as ColorStop;
    const b = stops[i + 1] as ColorStop;
    if (clamped <= b.t) {
      const span = b.t - a.t;
      const local = span === 0 ? 0 : (clamped - a.t) / span;
      return lerpRgb(a.rgb, b.rgb, local);
    }
  }
  return (stops[stops.length - 1] as ColorStop).rgb;
}

export function makeLinearScale(
  stops: ReadonlyArray<ColorStop>,
  domain: [number, number],
): (value: number) => RGB {
  const [lo, hi] = domain;
  const span = hi - lo;
  return (value: number) => {
    if (span === 0) return sampleScale(stops, 0);
    return sampleScale(stops, (value - lo) / span);
  };
}

export function rgbToCss(rgb: RGB): string {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}
