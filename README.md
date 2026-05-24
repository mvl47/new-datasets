# FfE Geodata Platform

Interactive web platform visualizing 11 FfE energy-economics geo datasets,
modeled on [solutions.ffe.de/products/solar](https://solutions.ffe.de/products/solar).

## Status

PHASE 1 — alle 11 Datensätze sind als interaktive Views implementiert, jeweils
mit deterministisch generierten Mock-Daten. Karte (MapLibre + deck.gl),
Choroplethen-Bundesländer-Geometrie, Klimadiagramm und 8760-h-Profile laufen.
Die Python-Pipeline (echte Daten, PMTiles-Basemap, 100 m Raster) folgt in
PHASE 2.

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

All shipped in PHASE 1 (mock data — real data pipeline is PHASE 2).

| # | Slug | Pattern | Distinctive interaction |
|---|---|---|---|
| 1 | mastr-clean | ScatterplotLayer | Before/After slider; raw vs cleaned MaStR |
| 2 | consumption-industry | Choropleth (oranges) | WZ section drill-down |
| 3 | consumption-ghd | Choropleth (blues) + donut | National GHD split, group selector |
| 4 | consumption-phh | Choropleth / HeatmapLayer | Bundesland ↔ Raster toggle |
| 5 | potential-pv-ground | PolygonLayer | 2D ↔ 3D extrusion, min-capacity filter |
| 6 | potential-wind-onshore | Polygons + ScatterplotLayer | Flächen / Anlagen / Beides toggle (WiSTL overlay) |
| 7 | potential-wind-offshore | HeatmapLayer + parks | Nordsee / Ostsee / Beides filter |
| 8 | timeseries-pv | Choropleth + line chart | 8760-h slider drives both views |
| 9 | timeseries-wind | Choropleth + line chart | Onshore / Offshore toggle |
| 10 | population | Diverging choropleth + line | Year slider 2010–2030 |
| 11 | weather | Choropleth + climograph | Metric toggle, click-to-select Bundesland |

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
