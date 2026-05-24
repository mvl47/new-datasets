# FfE data pipeline

Python pipeline that fetches authoritative geodata sources, normalises them,
and emits artifacts the React app consumes (defaults to
`apps/web/public/data/`).

## Sources

| Source | Dataset(s) | Auth required |
|---|---|---|
| [BKG VG250](https://gdz.bkg.bund.de/index.php/default/open-data/verwaltungsgebiete-1-250-000-mit-einwohnerzahlen-stand-31-12-vg250-ew-31-12.html) | Bundesländer boundaries — every choropleth | no |
| [MaStR](https://www.marktstammdatenregister.de/MaStR/Datendownload) | `mastr-clean` | no |
| [Destatis GENESIS-Online](https://www.regionalstatistik.de/genesis/online) | `population` (+ consumption helpers) | yes — token |
| [Copernicus CDS / ERA5](https://cds.climate.copernicus.eu) | `timeseries-pv`, `timeseries-wind`, `weather` | yes — API key |

## Setup

```sh
cd data-pipeline
uv sync --extra dev        # creates .venv and installs runtime + dev deps
cp .env.example .env       # fill in DESTATIS_API_TOKEN / CDS_API_KEY when needed
```

`uv` is used as the runner because it is fast and lockfile-driven. Alternatives
(`pip install -e .[dev]` from any venv) work too — the `Makefile` only needs
`PY=python` instead.

## Run

```sh
make boundaries     # BKG VG250 → apps/web/public/data/bundeslaender.geojson
make mastr          # MaStR → apps/web/public/data/mastr-clean.geojson
make destatis       # GENESIS → apps/web/public/data/population.json
make era5           # ERA5 → apps/web/public/data/timeseries-{pv,wind}.json
make all            # everything in dependency order
```

Add `--force` (e.g. `uv run ffe-pipeline boundaries --force`) to ignore the
on-disk cache and re-download.

## Output convention

Every artifact lands under `apps/web/public/data/` (override with the
`FFE_OUTPUT_DIR` env var). Vite serves them at `/data/*`. The web app reads
them at runtime and falls back to the deterministic mock generators when
the file is missing — meaning the app stays runnable without ever running
the pipeline.

## Tests

```sh
make test           # uv run pytest
make lint           # ruff check
make format         # ruff format
```

Tests use in-memory or `responses`-mocked HTTP. No live network call is
performed in CI; the live fetchers are integration-tested only when
credentials are configured.

## Attribution

When the pipeline runs successfully, embed the matching attribution in the
web app's footer:

- Boundaries: `© GeoBasis-DE / BKG <year>` (Datenlizenz Deutschland 2.0)
- MaStR: `Quelle: Marktstammdatenregister, Bundesnetzagentur`
- Destatis: `Quelle: Statistisches Bundesamt (Destatis), <year>`
- ERA5: `Generated using Copernicus Climate Change Service information <year>`
