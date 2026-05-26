"""DWD Klimanormalen 1991-2020 → weather.json.

The Deutscher Wetterdienst publishes 30-year monthly climate normals
under `opendata.dwd.de`. For each station we read monthly mean air
temperature (°C) and monthly mean precipitation (mm), spatial-join the
stations to the BKG bundesländer.geojson produced earlier in this
phase, and emit one entry per Bundesland with the mean across its
stations.

DWD files use a semicolon-separated format with a German header. Layout
captured here is the one shipped under ``multi_annual/mean_91-20`` —
the test fixture documents the columns expected by the parser.
"""

from __future__ import annotations

import csv
import io
import json
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from shapely.geometry import Point

from .http import download
from .logging import get_logger
from .masking import load_bundesland_polygons
from .paths import output_dir

log = get_logger(__name__)

DWD_BASE = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/multi_annual/mean_91-20"
TEMPERATURE_URL = f"{DWD_BASE}/air_temperature_mean_91-20.txt"
PRECIPITATION_URL = f"{DWD_BASE}/precipitation_91-20.txt"
STATIONS_URL = (
    "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/multi_annual/"
    "mean_91-20/KL_terminwerte_Beschreibung_Stationen.txt"
)

MONTH_FIELDS = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]


@dataclass(slots=True, frozen=True)
class Station:
    id: int
    lon: float
    lat: float


@dataclass(slots=True, frozen=True)
class StationMonthly:
    station_id: int
    values: list[float]  # 12 entries


def _german_float(text: str) -> float | None:
    cleaned = text.strip().replace(",", ".")
    if not cleaned or cleaned == "-999":
        return None
    try:
        v = float(cleaned)
    except ValueError:
        return None
    return None if v <= -990 else v


def parse_stations(text: str) -> list[Station]:
    """Parse the KL_terminwerte_Beschreibung_Stationen.txt fixed-width file."""
    stations: list[Station] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(("Stations", "----")):
            continue
        parts = line.split()
        if len(parts) < 6:
            continue
        try:
            station_id = int(parts[0])
            lat = float(parts[4].replace(",", "."))
            lon = float(parts[5].replace(",", "."))
        except ValueError:
            continue
        stations.append(Station(id=station_id, lon=lon, lat=lat))
    return stations


def parse_monthly_normals(text: str) -> list[StationMonthly]:
    """Parse one of the per-month normal CSV files.

    File header lists ``Stations_id;<other>;Jan;Feb;…;Dez;Jahr``.
    Values use ``,`` as decimal separator and ``-999`` for missing.
    """
    reader = csv.reader(io.StringIO(text), delimiter=";", quotechar='"')
    rows = iter(reader)
    header: list[str] = next(rows, [])
    headers = [h.strip() for h in header]
    if "Stations_id" not in headers:
        raise KeyError(f"expected 'Stations_id' column, got {headers!r}")
    id_idx = headers.index("Stations_id")
    month_idxs: list[int] = []
    for month in MONTH_FIELDS:
        if month not in headers:
            raise KeyError(f"expected month column {month!r} in {headers!r}")
        month_idxs.append(headers.index(month))

    out: list[StationMonthly] = []
    for row in rows:
        if len(row) <= max(month_idxs):
            continue
        try:
            station_id = int(row[id_idx].strip())
        except ValueError:
            continue
        values: list[float] = []
        skip = False
        for idx in month_idxs:
            val = _german_float(row[idx])
            if val is None:
                skip = True
                break
            values.append(val)
        if skip:
            continue
        out.append(StationMonthly(station_id=station_id, values=values))
    return out


def assign_stations_to_bundeslaender(
    stations: Iterable[Station],
    polygons: dict,
) -> dict[str, list[int]]:
    """Return ``{code: [station_id, …]}`` for every BL the stations fall into."""
    out: dict[str, list[int]] = {code: [] for code in polygons}
    for s in stations:
        pt = Point(s.lon, s.lat)
        for code, geom in polygons.items():
            if geom.contains(pt):
                out[code].append(s.id)
                break
    return out


def average_monthly_per_bundesland(
    assignment: dict[str, list[int]],
    monthly: Iterable[StationMonthly],
) -> dict[str, list[float]]:
    """Mean across the stations that landed in each Bundesland."""
    by_station: dict[int, list[float]] = {m.station_id: m.values for m in monthly}
    out: dict[str, list[float]] = {}
    for code, ids in assignment.items():
        relevant = [by_station[i] for i in ids if i in by_station]
        if not relevant:
            continue
        means = [round(sum(r[m] for r in relevant) / len(relevant), 2) for m in range(12)]
        out[code] = means
    return out


def shape_for_web(
    monthly_temp: dict[str, list[float]],
    monthly_precip: dict[str, list[float]],
) -> dict:
    """Reformat the per-BL monthly arrays into the WeatherView payload."""
    codes = sorted(set(monthly_temp) | set(monthly_precip))
    payload: dict[str, dict[str, float | list[dict[str, float]]]] = {}
    for code in codes:
        temps = monthly_temp.get(code)
        precips = monthly_precip.get(code)
        if not temps or not precips:
            continue
        monthly: list[dict[str, float]] = [
            {"tempC": round(t, 2), "precipMm": round(p, 1)}
            for t, p in zip(temps, precips, strict=True)
        ]
        annual_precip = round(sum(precips), 1)
        mean_temp = round(sum(temps) / 12, 2)
        payload[code] = {
            "monthly": monthly,
            "meanTempC": mean_temp,
            "annualPrecipMm": annual_precip,
        }
    return {"byBundesland": payload}


def write_weather(payload: dict, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"))
    log.info("wrote %s (%.1f kB)", target, target.stat().st_size / 1024)


def run_weather(*, force: bool = False) -> Path:
    boundaries_path = output_dir() / "bundeslaender.geojson"
    if not boundaries_path.exists():
        raise FileNotFoundError(f"missing {boundaries_path} — run `make boundaries` first.")
    polygons = load_bundesland_polygons(boundaries_path)

    stations_file = download(STATIONS_URL, namespace="dwd", force=force)
    stations = parse_stations(stations_file.read_text(encoding="latin-1"))
    assignment = assign_stations_to_bundeslaender(stations, polygons)

    temp_file = download(TEMPERATURE_URL, namespace="dwd", force=force)
    precip_file = download(PRECIPITATION_URL, namespace="dwd", force=force)
    monthly_temp = parse_monthly_normals(temp_file.read_text(encoding="latin-1"))
    monthly_precip = parse_monthly_normals(precip_file.read_text(encoding="latin-1"))

    temp_per_bl = average_monthly_per_bundesland(assignment, monthly_temp)
    precip_per_bl = average_monthly_per_bundesland(assignment, monthly_precip)
    payload = shape_for_web(temp_per_bl, precip_per_bl)
    if not payload["byBundesland"]:
        raise RuntimeError(
            "no Bundesländer had matching stations + normals — check DWD file layout"
        )
    target = output_dir() / "weather.json"
    write_weather(payload, target)
    return target
