# FfE Geodata Platform

Interactive web platform visualizing 11 FfE energy-economics geo datasets,
modeled on [solutions.ffe.de/products/solar](https://solutions.ffe.de/products/solar).

## Status

PHASE 0 scaffold — navigable empty application shell. Datasets, mock data and
the data pipeline ship in later phases.

## Stack

- React 19 + Vite + TypeScript (strict)
- TailwindCSS v4
- MapLibre GL JS + deck.gl
- Zustand + React Router v7
- Apache ECharts
- i18next (DE/EN)
- ESLint + Prettier + Vitest
- pnpm workspaces

## Quick start

```sh
pnpm install
pnpm dev          # start dev server (apps/web on http://localhost:5173)
pnpm build        # production build
pnpm lint
pnpm test
```

## Layout

```
apps/web/          React app (the only workspace member for now)
data-pipeline/     Python pipeline scripts (later phases)
docs/datasets/     README per dataset (later phases)
```

## The 11 datasets

| # | Slug | Visualization |
|---|---|---|
| 1 | mastr-clean | Point map with before/after slider |
| 2 | consumption-industry | Choropleth, WZ drill-down |
| 3 | consumption-ghd | Choropleth + WZ-group donut |
| 4 | consumption-phh | Choropleth + 100 m raster |
| 5 | potential-pv-ground | Polygon-sharp + 3D extrusion |
| 6 | potential-wind-onshore | Polygon-sharp + WiSTL overlay |
| 7 | potential-wind-offshore | Raster heatmap (bathymetric basemap) |
| 8 | timeseries-pv | Choropleth + 8760 h line chart |
| 9 | timeseries-wind | Choropleth + on/offshore toggle |
| 10 | population | Choropleth growth rate + time slider |
| 11 | weather | Choropleth + climate diagram |

## Basemap

Dev defaults to OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`).
Override via `VITE_BASEMAP_STYLE_URL` in `apps/web/.env.local`. A self-contained
fallback style with no external dependencies ships at
`apps/web/public/style-blank.json` — useful for offline dev, automated
screenshots, or any environment that blocks public tile servers
(`VITE_BASEMAP_STYLE_URL=/style-blank.json`). Production should point at a
self-hosted PMTiles basemap — no external tile servers in production.

## License

MIT — see [LICENSE](./LICENSE).
