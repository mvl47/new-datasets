#!/usr/bin/env node
// Bundle-size budget for the main entry chunk.
// CI fails the PR when the gzipped size goes past BUDGET_KB so that
// growth is a deliberate, reviewable decision instead of a silent regression.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGETS_KB = {
  // Main entry — MapLibre + deck.gl core + react + i18next + zustand
  'index': 550,
  // ECharts is heavy and loaded on demand; keep it in check anyway
  'EChart': 230,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(here, '..', 'dist', 'assets');

function chunkBaseName(file) {
  // index-abc123.js → "index" ; EChart-DEF.js → "EChart"
  const match = /^([A-Za-z]+)-[\w-]+\.js$/.exec(file);
  return match ? match[1] : null;
}

async function main() {
  let files;
  try {
    files = await readdir(assetsDir);
  } catch (err) {
    console.error(`cannot read ${assetsDir}: ${err.message}`);
    console.error('did you run `pnpm build` first?');
    process.exit(1);
  }

  const rows = [];
  let failed = false;

  for (const [base, budgetKb] of Object.entries(BUDGETS_KB)) {
    const match = files.find((f) => chunkBaseName(f) === base);
    if (!match) {
      rows.push({ name: base, file: '<missing>', rawKb: 0, gzKb: 0, budgetKb, status: 'MISSING' });
      failed = true;
      continue;
    }
    const raw = await readFile(path.join(assetsDir, match));
    const gzKb = gzipSync(raw, { level: 9 }).length / 1024;
    const rawKb = raw.length / 1024;
    const status = gzKb <= budgetKb ? 'OK' : 'FAIL';
    if (status === 'FAIL') failed = true;
    rows.push({ name: base, file: match, rawKb, gzKb, budgetKb, status });
  }

  const widths = { name: 8, file: 38, raw: 10, gz: 10, budget: 10, status: 6 };
  const header =
    'chunk'.padEnd(widths.name) +
    'file'.padEnd(widths.file) +
    'raw kB'.padStart(widths.raw) +
    'gzip kB'.padStart(widths.gz) +
    'budget'.padStart(widths.budget) +
    '  ' +
    'status'.padEnd(widths.status);
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of rows) {
    console.log(
      r.name.padEnd(widths.name) +
        r.file.padEnd(widths.file) +
        r.rawKb.toFixed(1).padStart(widths.raw) +
        r.gzKb.toFixed(1).padStart(widths.gz) +
        String(r.budgetKb).padStart(widths.budget) +
        '  ' +
        r.status.padEnd(widths.status),
    );
  }

  if (failed) {
    console.error('\nBundle size budget violated.');
    console.error('Either trim the chunk or bump the budget in apps/web/scripts/check-bundle-size.mjs.');
    process.exit(1);
  }
  console.log('\nAll chunks within budget.');
}

await main();
