.PHONY: help install boundaries mastr destatis era5 all clean test lint format

PY ?= uv run --no-sync python
UV ?= uv

help:
	@echo "FfE pipeline — common targets"
	@echo "  make install     create the venv and install runtime + dev deps"
	@echo "  make boundaries  BKG VG250 → apps/web/public/data/bundeslaender.geojson"
	@echo "  make mastr       MaStR bulk → apps/web/public/data/mastr-clean.geojson"
	@echo "  make destatis    GENESIS → apps/web/public/data/population.json"
	@echo "  make era5        ERA5 → apps/web/public/data/timeseries-{pv,wind}.json"
	@echo "  make all         everything above (boundaries, mastr, destatis, era5)"
	@echo "  make test        pytest"
	@echo "  make lint        ruff check"
	@echo "  make format      ruff format"
	@echo "  make clean       remove data/cache and data/out"

install:
	$(UV) sync --extra dev

boundaries:
	$(PY) -m ffe_pipeline.cli boundaries

mastr:
	$(PY) -m ffe_pipeline.cli mastr

destatis:
	$(PY) -m ffe_pipeline.cli destatis

era5:
	$(PY) -m ffe_pipeline.cli era5

all: boundaries mastr destatis era5

test:
	$(PY) -m pytest

lint:
	$(UV) run ruff check .

format:
	$(UV) run ruff format .

clean:
	rm -rf data/cache data/out
