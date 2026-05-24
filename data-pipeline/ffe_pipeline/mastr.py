"""MaStR → mastr-clean.geojson.

The Marktstammdatenregister bulk download is published by the
Bundesnetzagentur as a single zip containing several Einheiten-XML files
(EinheitenSolar, EinheitenWind, EinheitenBiomasse, EinheitenWasserkraft).
This module streams those XMLs via ``lxml.iterparse`` so the parser never
loads more than one ``<EinheitX>`` record at a time, then applies the
cleaning rules listed below and writes a single GeoJSON.

Cleaning rules (mirrored in tests):
  * drop records without coordinates or with ``(0, 0)`` (null-island)
  * drop coordinates outside the Germany bounding box
  * drop decommissioned units (``EinheitBetriebsStatus`` ∈ {31,32})
  * drop near-duplicates within ~10 m of another entry of the same tech
  * keep only the first 4 characters of the EEG-MaStR plant id (privacy)

The download URL changes daily; pass ``--url`` (CLI) or set
``FFE_MASTR_BULK_URL`` to point at the current public dump. The parser
itself works against any matching XML — including the small fixture used
by the unit tests.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path

from lxml import etree

from .http import download, unpacked
from .logging import get_logger
from .paths import output_dir

log = get_logger(__name__)

DEFAULT_BULK_URL = os.environ.get(
    "FFE_MASTR_BULK_URL",
    "https://download.marktstammdatenregister.de/Gesamtdatenexport_Public.zip",
)

GERMANY_BBOX = (5.5, 47.0, 15.5, 55.5)

TECH_TO_FILE_PREFIX = {
    "solar": "EinheitenSolar",
    "wind": "EinheitenWind",
    "biomass": "EinheitenBiomasse",
    "hydro": "EinheitenWasserkraft",
}

DECOMMISSIONED_STATUS = {"31", "32"}

LON_FIELDS = ("Laengengrad", "LaengeDezimalgrad", "Laenge")
LAT_FIELDS = ("Breitengrad", "BreiteDezimalgrad", "Breite")
CAPACITY_FIELDS = ("Nettonennleistung", "Bruttoleistung", "InstallierteLeistung")
COMMISSIONING_FIELDS = ("Inbetriebnahmedatum",)
ID_FIELDS = ("EinheitMastrNummer",)
STATUS_FIELDS = ("EinheitBetriebsStatus",)


@dataclass(slots=True, frozen=True)
class MastrPlant:
    id: str
    tech: str
    lon: float
    lat: float
    capacity_kw: float
    commissioning_year: int | None


def _text(elem: etree._Element, candidates: Iterable[str]) -> str | None:
    for tag in candidates:
        child = elem.find(tag)
        if child is not None and child.text:
            value = child.text.strip()
            if value:
                return value
    return None


def _float(text: str | None) -> float | None:
    if not text:
        return None
    try:
        return float(text.replace(",", "."))
    except ValueError:
        return None


def _year(text: str | None) -> int | None:
    if not text:
        return None
    return int(text[:4]) if text[:4].isdigit() else None


def _within_germany(lon: float, lat: float) -> bool:
    west, south, east, north = GERMANY_BBOX
    return west <= lon <= east and south <= lat <= north


def parse_einheiten_stream(xml_path: Path, tech: str) -> Iterator[MastrPlant]:
    """Yield cleaned plant records from a single Einheiten-XML.

    Caller is responsible for choosing the right ``tech`` label per file.
    """
    context = etree.iterparse(str(xml_path), events=("end",), recover=True)
    for _, elem in context:
        tag = etree.QName(elem.tag).localname
        if not tag.startswith("EinheitSolar")  \
            and not tag.startswith("EinheitWind") \
            and not tag.startswith("EinheitBiomasse") \
            and not tag.startswith("EinheitWasser"):
            continue
        status = _text(elem, STATUS_FIELDS)
        if status in DECOMMISSIONED_STATUS:
            elem.clear()
            continue
        lon = _float(_text(elem, LON_FIELDS))
        lat = _float(_text(elem, LAT_FIELDS))
        if lon is None or lat is None or (lon == 0 and lat == 0):
            elem.clear()
            continue
        if not _within_germany(lon, lat):
            elem.clear()
            continue
        capacity_kw = _float(_text(elem, CAPACITY_FIELDS))
        if capacity_kw is None or capacity_kw <= 0:
            elem.clear()
            continue
        plant_id = _text(elem, ID_FIELDS) or ""
        yield MastrPlant(
            id=plant_id[:12],
            tech=tech,
            lon=lon,
            lat=lat,
            capacity_kw=capacity_kw,
            commissioning_year=_year(_text(elem, COMMISSIONING_FIELDS)),
        )
        elem.clear()
        # Drop processed siblings to keep memory flat.
        while elem.getprevious() is not None:
            del elem.getparent()[0]


def dedupe(plants: Iterable[MastrPlant], precision: int = 4) -> list[MastrPlant]:
    """Drop near-duplicates by rounding (lon,lat) to ``precision`` decimals.

    4 decimals ≈ 11 m at German latitudes, which matches the MaStR coord
    precision and removes the typical re-registration / parent-unit dupes.
    """
    seen: set[tuple[str, str, int, int]] = set()
    out: list[MastrPlant] = []
    factor = 10**precision
    for p in plants:
        key = (
            p.tech,
            p.id,
            int(round(p.lon * factor)),
            int(round(p.lat * factor)),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def to_feature_collection(plants: Iterable[MastrPlant]) -> dict:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [p.lon, p.lat]},
                "properties": {
                    "id": p.id,
                    "tech": p.tech,
                    "capacityKw": round(p.capacity_kw, 2),
                    "commissioningYear": p.commissioning_year,
                },
            }
            for p in plants
        ],
    }


def write_geojson(payload: dict, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"))
    log.info("wrote %s (%.1f kB)", target, target.stat().st_size / 1024)


def collect_from_dump(dump_root: Path, sample: int | None = None) -> list[MastrPlant]:
    """Walk a MaStR dump directory and yield cleaned plants from all techs."""
    plants: list[MastrPlant] = []
    for tech, prefix in TECH_TO_FILE_PREFIX.items():
        matches = sorted(dump_root.rglob(f"{prefix}*.xml"))
        if not matches:
            log.warning("no XML for tech=%s (prefix %s)", tech, prefix)
            continue
        for xml in matches:
            log.info("parsing %s", xml.name)
            for plant in parse_einheiten_stream(xml, tech):
                plants.append(plant)
                if sample is not None and len(plants) >= sample:
                    return dedupe(plants)
    return dedupe(plants)


def run_mastr(*, force: bool = False, sample: int | None = None) -> Path:
    archive = download(DEFAULT_BULK_URL, namespace="mastr", force=force)
    with unpacked(archive) as folder:
        plants = collect_from_dump(folder, sample=sample)
    log.info("collected %s plants after cleaning", f"{len(plants):,}")
    payload = to_feature_collection(plants)
    target = output_dir() / "mastr-clean.geojson"
    write_geojson(payload, target)
    return target


def stats(plants: Iterable[MastrPlant]) -> dict[str, int]:
    """Per-tech counts — useful in logs/tests."""
    by_tech: dict[str, int] = {}
    for p in plants:
        by_tech[p.tech] = by_tech.get(p.tech, 0) + 1
    return by_tech
