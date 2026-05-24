"""BKG VG250 → simplified Bundesländer GeoJSON.

Source: Bundesamt für Kartographie und Geodäsie, Verwaltungsgebiete
1:250 000 (VG250) — open data under Geodatenzugangsgesetz, attribution
required (`© GeoBasis-DE / BKG <year>`).

The script downloads the ``vg250_01-01.utm32s.gpkg.ebenen.zip`` archive,
extracts the LAN (state) layer, reprojects to WGS84, simplifies geometries
with Douglas-Peucker (tolerance: 200 m before reprojection, configurable),
and writes a small GeoJSON the web app can consume.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING

from .http import download, unpacked
from .logging import get_logger
from .paths import output_dir

if TYPE_CHECKING:
    import geopandas as gpd

log = get_logger(__name__)

VG250_URL = (
    "https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/"
    "aktuell/vg250_01-01.utm32s.gpkg.ebenen.zip"
)

LAN_LAYER_NAME = "vg250_lan"
LAN_CODE_FIELD = "ARS"
LAN_NAME_FIELD = "GEN"
LAN_BOUNDARY_AREA_FIELD = "GF"
LAN_LAND_AREA_VALUES = (4,)

ARS_TO_CODE: dict[str, str] = {
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

DEFAULT_SIMPLIFY_M = 250.0


def code_from_ars(ars: str) -> str | None:
    """Return the 2-letter Bundesland code for an ARS value (first 2 chars)."""
    if not ars:
        return None
    return ARS_TO_CODE.get(ars[:2])


def _load_lan_layer(gpkg: Path) -> gpd.GeoDataFrame:
    import geopandas as gpd

    layers = sorted({n.lower() for n in gpd.list_layers(gpkg)["name"].tolist()})
    if LAN_LAYER_NAME not in layers:
        raise RuntimeError(f"layer {LAN_LAYER_NAME!r} missing — found: {layers}")
    return gpd.read_file(gpkg, layer=LAN_LAYER_NAME)


def process_lan(
    gdf: gpd.GeoDataFrame, *, simplify_m: float = DEFAULT_SIMPLIFY_M
) -> gpd.GeoDataFrame:
    """Filter, simplify, reproject and tag VG250 LAN rows.

    Reproject is intentionally deferred until AFTER simplification because
    ``simplify(tolerance, …)`` operates in geometry units — metres in UTM
    is meaningful, degrees in WGS84 is not.
    """
    if LAN_BOUNDARY_AREA_FIELD in gdf.columns:
        gdf = gdf[gdf[LAN_BOUNDARY_AREA_FIELD].isin(LAN_LAND_AREA_VALUES)].copy()
    if simplify_m > 0:
        gdf["geometry"] = gdf.geometry.simplify(simplify_m, preserve_topology=True)
    gdf = gdf.to_crs("EPSG:4326")
    gdf["code"] = gdf[LAN_CODE_FIELD].astype(str).map(code_from_ars)
    gdf = gdf.dropna(subset=["code"]).copy()
    gdf["name"] = gdf[LAN_NAME_FIELD]
    return gdf.dissolve(by="code", as_index=False, aggfunc={"name": "first"})


def to_geojson_payload(gdf: gpd.GeoDataFrame) -> dict:
    import json as _json

    raw = _json.loads(gdf.to_json())
    if "features" not in raw:
        return raw
    keep_props = ("code", "name")
    for feature in raw["features"]:
        props = feature.get("properties") or {}
        feature["properties"] = {k: props[k] for k in keep_props if k in props}
    return raw


def write_geojson(payload: dict, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"))
    log.info("wrote %s (%.1f kB)", target, target.stat().st_size / 1024)


def run_boundaries(*, force: bool = False) -> Path:
    """End-to-end: fetch, process, write."""
    archive = download(VG250_URL, namespace="bkg", force=force)
    with unpacked(archive) as folder:
        gpkgs = sorted(folder.rglob("DE_VG250.gpkg")) or sorted(folder.rglob("*.gpkg"))
        if not gpkgs:
            raise RuntimeError(f"no GeoPackage inside {archive.name}")
        gpkg = gpkgs[0]
        log.info("processing %s", gpkg.name)
        gdf = _load_lan_layer(gpkg)
    simplify = float(os.environ.get("FFE_BOUNDARIES_SIMPLIFY_M", DEFAULT_SIMPLIFY_M))
    processed = process_lan(gdf, simplify_m=simplify)
    payload = to_geojson_payload(processed)
    target = output_dir() / "bundeslaender.geojson"
    write_geojson(payload, target)
    return target
