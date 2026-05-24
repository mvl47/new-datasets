"""Pipeline CLI — ``python -m ffe_pipeline.cli <command>``."""

from __future__ import annotations

import click

from . import __version__
from .logging import get_logger

log = get_logger(__name__)


@click.group()
@click.version_option(__version__, prog_name="ffe-pipeline")
def cli() -> None:
    """Fetch and process raw geodata for the FfE Geodata Platform."""


@cli.command()
@click.option("--force", is_flag=True, help="Ignore the cache and re-download VG250.")
def boundaries(force: bool) -> None:
    """Fetch BKG VG250 and emit bundeslaender.geojson."""
    from .boundaries import run_boundaries

    run_boundaries(force=force)


@cli.command()
@click.option("--force", is_flag=True, help="Ignore the cache and re-download MaStR.")
@click.option(
    "--sample",
    type=int,
    default=None,
    help="Process only the first N records (smoke test).",
)
def mastr(force: bool, sample: int | None) -> None:
    """Fetch MaStR bulk download and emit mastr-clean.geojson."""
    from .mastr import run_mastr

    run_mastr(force=force, sample=sample)


@cli.command()
@click.option("--force", is_flag=True, help="Ignore the cache and re-fetch GENESIS.")
def destatis(force: bool) -> None:
    """Fetch population from Destatis GENESIS and emit population.json."""
    from .destatis import run_destatis

    run_destatis(force=force)


@cli.command()
@click.option("--force", is_flag=True, help="Re-request even if cached.")
@click.option(
    "--variable",
    type=click.Choice(["wind", "solar", "both"]),
    default="both",
    help="Which ERA5 variable bundles to fetch.",
)
def era5(force: bool, variable: str) -> None:
    """Fetch ERA5 hourly data and emit timeseries-{pv,wind}.json."""
    from .era5 import run_era5

    run_era5(force=force, variable=variable)


if __name__ == "__main__":
    cli()
