"""Placeholder for the ERA5 fetcher (wind + solar timeseries)."""

from __future__ import annotations


def run_era5(*, force: bool = False, variable: str = "both") -> None:
    _ = force, variable
    raise NotImplementedError(
        "ERA5 fetcher not implemented yet — coming in a follow-up commit."
    )
