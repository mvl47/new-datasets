from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Polygon

from ffe_pipeline import boundaries


def _fixture_lan() -> gpd.GeoDataFrame:
    """A tiny VG250-like GDF: 2 LAN polygons + 1 sea polygon (GF=2).

    Coordinates are intentionally simple UTM-32N values; geometry-unit
    simplification with metres becomes meaningful.
    """
    rows = [
        {
            boundaries.LAN_CODE_FIELD: "09",
            boundaries.LAN_NAME_FIELD: "Bayern",
            boundaries.LAN_BOUNDARY_AREA_FIELD: 4,
            "geometry": Polygon(
                [
                    (500_000, 5_400_000),
                    (700_000, 5_400_000),
                    (700_000, 5_600_000),
                    (500_000, 5_600_000),
                    (500_000, 5_400_000),
                ]
            ),
        },
        {
            boundaries.LAN_CODE_FIELD: "11",
            boundaries.LAN_NAME_FIELD: "Berlin",
            boundaries.LAN_BOUNDARY_AREA_FIELD: 4,
            "geometry": Polygon(
                [
                    (790_000, 5_820_000),
                    (820_000, 5_820_000),
                    (820_000, 5_840_000),
                    (790_000, 5_840_000),
                    (790_000, 5_820_000),
                ]
            ),
        },
        {
            boundaries.LAN_CODE_FIELD: "01",
            boundaries.LAN_NAME_FIELD: "Schleswig-Holstein (See)",
            boundaries.LAN_BOUNDARY_AREA_FIELD: 2,
            "geometry": Polygon(
                [
                    (500_000, 6_000_000),
                    (510_000, 6_000_000),
                    (510_000, 6_010_000),
                    (500_000, 6_010_000),
                    (500_000, 6_000_000),
                ]
            ),
        },
    ]
    return gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:25832")


def test_code_from_ars_maps_first_two_chars() -> None:
    assert boundaries.code_from_ars("091") == "BY"
    assert boundaries.code_from_ars("01001000") == "SH"
    assert boundaries.code_from_ars("") is None
    assert boundaries.code_from_ars("99") is None


def test_process_lan_drops_sea_rows_and_emits_codes() -> None:
    gdf = boundaries.process_lan(_fixture_lan(), simplify_m=0)
    codes = set(gdf["code"])
    assert codes == {"BY", "BE"}
    assert "SH" not in codes
    assert gdf.crs.to_string() == "EPSG:4326"


def test_process_lan_simplification_reduces_vertices() -> None:
    pts = [(0, 0), (10, 1), (20, 0), (30, 1), (40, 0), (50, 1), (60, 0), (0, 0)]
    gdf = gpd.GeoDataFrame(
        [
            {
                boundaries.LAN_CODE_FIELD: "09",
                boundaries.LAN_NAME_FIELD: "Bayern",
                boundaries.LAN_BOUNDARY_AREA_FIELD: 4,
                "geometry": Polygon(pts),
            }
        ],
        geometry="geometry",
        crs="EPSG:25832",
    )
    before = len(list(gdf.iloc[0].geometry.exterior.coords))
    after = len(list(boundaries.process_lan(gdf, simplify_m=20).iloc[0].geometry.exterior.coords))
    assert after < before


def test_to_geojson_payload_keeps_only_whitelisted_props(tmp_path: Path) -> None:
    processed = boundaries.process_lan(_fixture_lan(), simplify_m=0)
    payload = boundaries.to_geojson_payload(processed)
    out = tmp_path / "bundeslaender.geojson"
    boundaries.write_geojson(payload, out)
    parsed = json.loads(out.read_text(encoding="utf-8"))
    assert parsed["type"] == "FeatureCollection"
    codes = {f["properties"]["code"] for f in parsed["features"]}
    assert codes == {"BY", "BE"}
    for feature in parsed["features"]:
        assert set(feature["properties"].keys()) == {"code", "name"}
