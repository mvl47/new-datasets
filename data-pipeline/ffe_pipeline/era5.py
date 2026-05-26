"""ERA5 (Copernicus CDS) → timeseries-{wind,pv}.json.

ERA5 single-levels hourly reanalysis is fetched via the Copernicus CDS
API (``cdsapi`` package, registered API key). Two variable bundles:

  * ``wind``  — 100 m u/v wind components → wind speed → power curve
  * ``pv``    — surface solar radiation downwards (ssrd, J/m²/s aggregated
                to hourly) → DC then AC PV with a performance ratio

Fetching is heavy (~hundreds of MB per year nationwide) so:

  * the CDS request lands in ``data/cache/era5/`` and is reused on rerun
  * ``cdsapi``, ``xarray`` and ``netcdf4`` are pulled in lazily — only
    when the live fetch / NetCDF reader actually run, never during
    tests. The pure numerical helpers below are imported in any
    environment.

Tests cover the pure functions; the live fetch is exercised manually
once API credentials are configured.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from .logging import get_logger
from .paths import cache_dir, output_dir

if TYPE_CHECKING:
    import xarray as xr

log = get_logger(__name__)

GERMANY_BBOX_CDS = [55.1, 5.9, 47.3, 15.1]  # N, W, S, E (CDS convention)
HOURS_IN_YEAR = 8760

WIND_VARIABLES = ["100m_u_component_of_wind", "100m_v_component_of_wind"]
PV_VARIABLES = ["surface_solar_radiation_downwards"]

CDS_DATASET = "reanalysis-era5-single-levels"


def build_request(
    year: int,
    variables: Iterable[str],
    *,
    bbox: list[float] | None = None,
) -> dict:
    """Compose the CDS API request body for one full year of hourly data."""
    months = [f"{m:02d}" for m in range(1, 13)]
    days = [f"{d:02d}" for d in range(1, 32)]
    times = [f"{h:02d}:00" for h in range(24)]
    return {
        "product_type": "reanalysis",
        "format": "netcdf",
        "variable": list(variables),
        "year": str(year),
        "month": months,
        "day": days,
        "time": times,
        "area": bbox or GERMANY_BBOX_CDS,
    }


def fetch_era5_netcdf(
    year: int,
    variables: Iterable[str],
    *,
    label: str,
    force: bool = False,
) -> Path:
    """Submit a CDS request and cache the NetCDF locally."""
    target = cache_dir("era5") / f"{label}-{year}.nc"
    if target.exists() and not force:
        log.info("cache hit: %s", target.name)
        return target

    try:
        import cdsapi
    except ImportError as exc:
        raise ImportError(
            "cdsapi is required for the live ERA5 fetch — install the optional "
            "extra with `uv sync --extra era5`."
        ) from exc

    client = cdsapi.Client(
        url=os.environ.get("CDS_API_URL"),
        key=os.environ.get("CDS_API_KEY"),
    )
    request = build_request(year, variables)
    log.info("CDS request: %s (variables=%s)", CDS_DATASET, list(variables))
    client.retrieve(CDS_DATASET, request, str(target))
    log.info("cached %s (%.1f MB)", target.name, target.stat().st_size / 1024 / 1024)
    return target


def open_era5(nc_path: Path) -> xr.Dataset:
    """Lazy NetCDF reader — pulls in xarray + netcdf4 on demand."""
    try:
        import xarray as xr
    except ImportError as exc:
        raise ImportError(
            "xarray is required for ERA5 processing — install the optional "
            "extra with `uv sync --extra era5`."
        ) from exc
    return xr.open_dataset(nc_path)


def wind_speed(u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Pythagorean wind speed magnitude in m/s from u/v components."""
    return np.sqrt(u**2 + v**2)


def wind_power_curve(
    speed_ms: np.ndarray, *, cut_in: float = 3.0, rated: float = 12.0, cut_out: float = 25.0
) -> np.ndarray:
    """Capacity factor 0..1 from instantaneous wind speed.

    Mirrors the JS model in apps/web — cubic ramp between cut-in and
    rated, flat at 1 until cut-out, zero outside the operating window.
    """
    cf = np.zeros_like(speed_ms, dtype=np.float64)
    operating = (speed_ms >= cut_in) & (speed_ms < cut_out)
    cf = np.where(speed_ms >= rated, 1.0, cf)
    ramp_mask = operating & (speed_ms < rated)
    cf = np.where(
        ramp_mask,
        ((speed_ms - cut_in) / (rated - cut_in)) ** 3,
        cf,
    )
    cf = np.where(speed_ms >= cut_out, 0.0, cf)
    return np.clip(cf, 0.0, 1.0)


def pv_capacity_factor(
    ssrd_j_per_m2: np.ndarray,
    *,
    panel_efficiency: float = 0.20,
    performance_ratio: float = 0.85,
    rated_irradiance_w_per_m2: float = 1000.0,
) -> np.ndarray:
    """Capacity factor 0..1 from accumulated hourly irradiance (J/m²).

    ERA5 SSRD is accumulated over the hour ending at the timestamp, so
    the average irradiance during that hour is ``ssrd / 3600``.
    """
    irradiance_w = ssrd_j_per_m2 / 3600.0
    cf = (irradiance_w / rated_irradiance_w_per_m2) * panel_efficiency * performance_ratio / 0.20
    return np.clip(cf, 0.0, 1.0)


def to_timeseries_payload(series_mw: Mapping[str, np.ndarray], national_mw: np.ndarray) -> dict:
    """Shape per-Bundesland + national arrays for the web app loader.

    ``series_mw`` keys are 2-letter Bundesland codes; values are length
    ``HOURS_IN_YEAR`` arrays. The web loader builds the choropleth from
    ``byBundesland`` and the line chart from ``national``.
    """
    return {
        "hoursInYear": int(national_mw.shape[0]),
        "byBundesland": {
            code: [round(float(v), 1) for v in arr] for code, arr in series_mw.items()
        },
        "national": [round(float(v), 1) for v in national_mw],
    }


def write_timeseries(payload: dict, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"))
    log.info("wrote %s (%.1f kB)", target, target.stat().st_size / 1024)


def _process_wind(year: int, force: bool) -> Path:
    nc_path = fetch_era5_netcdf(year, WIND_VARIABLES, label="wind", force=force)
    ds = open_era5(nc_path)
    capacities = _load_wind_capacities()
    series = _aggregate_per_bundesland_wind(ds, capacities)
    national = sum(series.values()) if series else np.zeros(HOURS_IN_YEAR)
    payload = to_timeseries_payload(series, national)
    target = output_dir() / "timeseries-wind.json"
    write_timeseries(payload, target)
    return target


def _process_pv(year: int, force: bool) -> Path:
    nc_path = fetch_era5_netcdf(year, PV_VARIABLES, label="pv", force=force)
    ds = open_era5(nc_path)
    capacities = _load_pv_capacities()
    series = _aggregate_per_bundesland_pv(ds, capacities)
    national = sum(series.values()) if series else np.zeros(HOURS_IN_YEAR)
    payload = to_timeseries_payload(series, national)
    target = output_dir() / "timeseries-pv.json"
    write_timeseries(payload, target)
    return target


CONFIG_DIR = Path(__file__).parent / "config"
WIND_CAPACITY_FILE = CONFIG_DIR / "capacities_wind_onshore.json"
PV_CAPACITY_FILE = CONFIG_DIR / "capacities_pv.json"


def load_capacities(config_file: Path) -> dict[str, float]:
    """Load a per-Bundesland MW/MWp capacity table from JSON config."""
    with config_file.open("r", encoding="utf-8") as fp:
        payload = json.load(fp)
    values = payload.get("values", {})
    if not isinstance(values, dict):
        raise ValueError(f"{config_file}: 'values' must be an object")
    return {str(k): float(v) for k, v in values.items()}


def _load_wind_capacities() -> Mapping[str, float]:
    return load_capacities(WIND_CAPACITY_FILE)


def _load_pv_capacities() -> Mapping[str, float]:
    return load_capacities(PV_CAPACITY_FILE)


def aggregate_per_bundesland_wind(
    speed_ms: np.ndarray,
    cell_index: Mapping[str, tuple[list[int], list[int]]],
    capacities: Mapping[str, float],
) -> dict[str, np.ndarray]:
    """Per-Bundesland hourly wind generation (MW).

    Arguments:
      speed_ms     -- shape ``(time, lat, lon)`` wind speed magnitude
      cell_index   -- ``{code: (lat_idxs, lon_idxs)}`` from masking.cells_to_index_arrays
      capacities   -- ``{code: installed_MW}``
    """
    out: dict[str, np.ndarray] = {}
    n_times = speed_ms.shape[0]
    for code, (lat_idxs, lon_idxs) in cell_index.items():
        if code not in capacities or not lat_idxs:
            out[code] = np.zeros(n_times, dtype=np.float64)
            continue
        cells = speed_ms[:, lat_idxs, lon_idxs]
        mean_speed = cells.mean(axis=1)
        cf = wind_power_curve(mean_speed)
        out[code] = cf * float(capacities[code])
    return out


def aggregate_per_bundesland_pv(
    ssrd_j_per_m2: np.ndarray,
    cell_index: Mapping[str, tuple[list[int], list[int]]],
    capacities: Mapping[str, float],
) -> dict[str, np.ndarray]:
    """Per-Bundesland hourly PV generation (MW)."""
    out: dict[str, np.ndarray] = {}
    n_times = ssrd_j_per_m2.shape[0]
    for code, (lat_idxs, lon_idxs) in cell_index.items():
        if code not in capacities or not lat_idxs:
            out[code] = np.zeros(n_times, dtype=np.float64)
            continue
        cells = ssrd_j_per_m2[:, lat_idxs, lon_idxs]
        mean_ssrd = cells.mean(axis=1)
        cf = pv_capacity_factor(mean_ssrd)
        out[code] = cf * float(capacities[code])
    return out


def _aggregate_per_bundesland_wind(
    ds: xr.Dataset,
    capacities: Mapping[str, float],
) -> dict[str, np.ndarray]:
    """xarray adapter: read u/v from a Dataset and aggregate via grid mask."""
    from .masking import build_grid_mask, cells_to_index_arrays, load_bundesland_polygons

    lat_name, lon_name = _coord_names(ds)
    lats = ds[lat_name].values
    lons = ds[lon_name].values
    polygons = load_bundesland_polygons(output_dir() / "bundeslaender.geojson")
    cell_index = cells_to_index_arrays(build_grid_mask(polygons, lats, lons))
    u = ds["u100"].values if "u100" in ds.variables else ds["100m_u_component_of_wind"].values
    v = ds["v100"].values if "v100" in ds.variables else ds["100m_v_component_of_wind"].values
    speed = wind_speed(u, v)
    return aggregate_per_bundesland_wind(speed, cell_index, capacities)


def _aggregate_per_bundesland_pv(
    ds: xr.Dataset,
    capacities: Mapping[str, float],
) -> dict[str, np.ndarray]:
    """xarray adapter: read ssrd from a Dataset and aggregate via grid mask."""
    from .masking import build_grid_mask, cells_to_index_arrays, load_bundesland_polygons

    lat_name, lon_name = _coord_names(ds)
    lats = ds[lat_name].values
    lons = ds[lon_name].values
    polygons = load_bundesland_polygons(output_dir() / "bundeslaender.geojson")
    cell_index = cells_to_index_arrays(build_grid_mask(polygons, lats, lons))
    ssrd_name = "ssrd" if "ssrd" in ds.variables else "surface_solar_radiation_downwards"
    ssrd = ds[ssrd_name].values
    return aggregate_per_bundesland_pv(ssrd, cell_index, capacities)


def _coord_names(ds: xr.Dataset) -> tuple[str, str]:
    """Pick the lat/lon coordinate names — ERA5 ships them as latitude/longitude."""
    lat_name = next((n for n in ("latitude", "lat") if n in ds.coords), "latitude")
    lon_name = next((n for n in ("longitude", "lon") if n in ds.coords), "longitude")
    return lat_name, lon_name


def run_era5(*, force: bool = False, variable: str = "both") -> list[Path]:
    year = int(os.environ.get("FFE_ERA5_YEAR", "2023"))
    outputs: list[Path] = []
    if variable in ("wind", "both"):
        outputs.append(_process_wind(year, force))
    if variable in ("pv", "both"):
        outputs.append(_process_pv(year, force))
    return outputs
