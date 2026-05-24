"""Destatis GENESIS-Online → population.json.

The German federal statistical office exposes a REST API that returns
tabular data in several formats. We use ``ffcsv`` (flat-file CSV) since
it parses with the stdlib ``csv`` module and is stable across table
versions.

Auth: GENESIS requires either a registered ``username/password`` pair or
a ``token``. Both work via env vars (see ``.env.example``); the
``anonymous`` account is sufficient for the population table on the
public endpoint, but rate-limited.

Default table: ``12411-0010`` — "Bevölkerung: Bundesländer, Stichtag,
Geschlecht" (population per Bundesland, by year, by sex). We aggregate
across sex and emit one series per Land.
"""

from __future__ import annotations

import csv
import io
import json
import os
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

import requests

from .logging import get_logger
from .paths import cache_dir, output_dir

log = get_logger(__name__)

DEFAULT_ENDPOINT = "https://www-genesis.destatis.de/genesisWS/rest/2020/data/tablefile"
DEFAULT_TABLE = "12411-0010"
DEFAULT_START_YEAR = 2010

DESTATIS_LAND_TO_CODE: dict[str, str] = {
    "01": "SH",
    "02": "HH",
    "03": "NI",
    "04": "HB",
    "05": "NW",
    "06": "HE",
    "07": "RP",
    "08": "BW",
    "09": "BY",
    "10": "SL",
    "11": "BE",
    "12": "BB",
    "13": "MV",
    "14": "SN",
    "15": "ST",
    "16": "TH",
}


@dataclass(slots=True, frozen=True)
class Credentials:
    username: str | None = None
    password: str | None = None
    token: str | None = None

    @classmethod
    def from_env(cls) -> Credentials:
        token = os.environ.get("DESTATIS_API_TOKEN")
        if token:
            return cls(token=token)
        user = os.environ.get("DESTATIS_USERNAME") or "anonymous"
        pw = os.environ.get("DESTATIS_PASSWORD") or ""
        return cls(username=user, password=pw)

    def query(self) -> dict[str, str]:
        if self.token:
            return {"username": self.token}
        return {"username": self.username or "anonymous", "password": self.password or ""}


def fetch_table_ffcsv(
    table_name: str,
    *,
    start_year: int = DEFAULT_START_YEAR,
    endpoint: str = DEFAULT_ENDPOINT,
    credentials: Credentials | None = None,
    timeout: int = 60,
    cache: bool = True,
) -> str:
    """Return the raw FFCSV string returned by GENESIS.

    Cached on disk per (table, start_year) so repeat runs don't hit the
    GENESIS rate limit.
    """
    creds = credentials or Credentials.from_env()
    cache_path = cache_dir("destatis") / f"{table_name}-{start_year}.ffcsv"
    if cache and cache_path.exists():
        log.info("cache hit: %s", cache_path.name)
        return cache_path.read_text(encoding="utf-8")

    params: dict[str, str] = {
        "name": table_name,
        "area": "all",
        "compress": "false",
        "format": "ffcsv",
        "startyear": str(start_year),
        **creds.query(),
    }
    log.info("GET %s name=%s", endpoint, table_name)
    response = requests.get(endpoint, params=params, timeout=timeout)
    response.raise_for_status()
    body = response.text
    cache_path.write_text(body, encoding="utf-8")
    return body


def parse_population_ffcsv(text: str) -> dict[str, dict[int, int]]:
    """Parse FFCSV → ``{code: {year: population}}``.

    FFCSV layout: ';'-separated, German-localised, with columns
    ``Zeit_Code, 1_Auspraegung_Code, 1_Auspraegung_Label, ... Wert``.
    We accept any column suffix layout and look up by header name.
    """
    reader = csv.reader(io.StringIO(text), delimiter=";", quotechar='"')
    rows = iter(reader)
    header: list[str] = next(rows, [])
    headers = [h.strip() for h in header]

    def find_index(*candidates: str) -> int:
        for c in candidates:
            if c in headers:
                return headers.index(c)
        raise KeyError(f"expected one of {candidates!r} in {headers!r}")

    year_idx = find_index("Zeit", "Stichtag", "Jahr")
    land_idx = find_index("1_Auspraegung_Code", "DLAND", "Bundesland_Code")
    value_idx = find_index("Wert", "WERT", "BEVSTD__Bevoelkerungsstand__Anzahl")

    series: dict[str, dict[int, int]] = {}
    for row in rows:
        if len(row) <= max(year_idx, land_idx, value_idx):
            continue
        year_raw = row[year_idx].strip()
        land_raw = row[land_idx].strip()
        value_raw = row[value_idx].strip().replace(".", "").replace(",", ".")
        if not year_raw or not land_raw or value_raw in ("", "-", "."):
            continue
        try:
            year = int(year_raw[:4])
            value = int(float(value_raw))
        except ValueError:
            continue
        code = DESTATIS_LAND_TO_CODE.get(land_raw[:2])
        if not code:
            continue
        series.setdefault(code, {})[year] = value
    return series


def shape_for_web(series: Mapping[str, Mapping[int, int]]) -> dict:
    """Reformat into the JSON shape the web app's loader expects.

    ``{
        "years": [2010, …, latestYear],
        "byBundesland": { "BW": [10737, …], … }   // values in thousands
      }``
    """
    if not series:
        return {"years": [], "byBundesland": {}}
    all_years = sorted({y for entries in series.values() for y in entries})
    by_code: dict[str, list[int]] = {}
    for code, entries in series.items():
        by_code[code] = [round(entries.get(y, 0) / 1000) for y in all_years]
    return {"years": all_years, "byBundesland": by_code}


def write_population(payload: dict, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"))
    log.info("wrote %s (%.1f kB)", target, target.stat().st_size / 1024)


def run_destatis(*, force: bool = False) -> Path:
    text = fetch_table_ffcsv(DEFAULT_TABLE, cache=not force)
    series = parse_population_ffcsv(text)
    payload = shape_for_web(series)
    if not payload["byBundesland"]:
        raise RuntimeError(
            f"no Bundesländer parsed from GENESIS response (table {DEFAULT_TABLE!r}). "
            "Check credentials and the FFCSV header layout."
        )
    target = output_dir() / "population.json"
    write_population(payload, target)
    log.info("years=%s codes=%s", payload["years"], sorted(payload["byBundesland"].keys()))
    return target


def known_codes(iterable: Iterable[str]) -> set[str]:
    """Return the subset of inputs that map to a Bundesland code."""
    return {c for c in iterable if c in DESTATIS_LAND_TO_CODE.values()}
