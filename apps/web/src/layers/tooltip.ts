import type { PickingInfo } from '@deck.gl/core';

const TOOLTIP_STYLE =
  'background: rgba(15,23,42,0.95); color: #f8fafc; padding: 6px 10px; ' +
  'font-size: 12px; line-height: 1.4; border-radius: 6px; ' +
  'box-shadow: 0 4px 12px rgba(0,0,0,0.18); pointer-events: none; ' +
  'max-width: 240px;';

const TITLE_STYLE = 'font-weight: 600; margin-bottom: 2px;';
const ROW_STYLE = 'display: flex; justify-content: space-between; gap: 12px;';
const LABEL_STYLE = 'color: rgba(248,250,252,0.65);';
const VALUE_STYLE = 'font-variant-numeric: tabular-nums;';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface TooltipRow {
  label: string;
  value: string;
}

export function renderTooltip(title: string, rows: ReadonlyArray<TooltipRow>): { html: string } {
  const safeTitle = escapeHtml(title);
  const rowsHtml = rows
    .map(
      (r) =>
        `<div style="${ROW_STYLE}"><span style="${LABEL_STYLE}">${escapeHtml(r.label)}</span>` +
        `<span style="${VALUE_STYLE}">${escapeHtml(r.value)}</span></div>`,
    )
    .join('');
  const html =
    `<div style="${TOOLTIP_STYLE}">` +
    `<div style="${TITLE_STYLE}">${safeTitle}</div>` +
    rowsHtml +
    `</div>`;
  return { html };
}

export function pickedFeatureCode(info: PickingInfo): string | null {
  const obj = info.object as { properties?: { code?: unknown } } | undefined;
  const code = obj?.properties?.code;
  return typeof code === 'string' ? code : null;
}
