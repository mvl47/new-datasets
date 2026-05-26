from __future__ import annotations

import json
from pathlib import Path

from ffe_pipeline import dwd

FIXTURES = Path(__file__).parent / "fixtures" / "dwd"
GERMANY_GEOJSON = Path(__file__).parent / "fixtures" / "dwd" / "_germany.geojson"


def _write_polygons(tmp_path: Path) -> Path:
    """Tiny FC covering the three fixture stations: BW, BY, BE."""
    payload = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"code": "BW", "name": "Baden-Württemberg"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [[7.5, 47.6], [10.5, 47.6], [10.5, 49.8], [7.5, 49.8], [7.5, 47.6]]
                    ],
                },
            },
            {
                "type": "Feature",
                "properties": {"code": "BY", "name": "Bayern"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [[10.0, 47.5], [13.5, 47.5], [13.5, 50.5], [10.0, 50.5], [10.0, 47.5]]
                    ],
                },
            },
            {
                "type": "Feature",
                "properties": {"code": "BE", "name": "Berlin"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [[13.1, 52.4], [13.7, 52.4], [13.7, 52.7], [13.1, 52.7], [13.1, 52.4]]
                    ],
                },
            },
        ],
    }
    path = tmp_path / "bundeslaender.geojson"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_parse_stations_reads_lat_lon() -> None:
    stations = dwd.parse_stations(
        (FIXTURES / "stations.txt").read_text(encoding="utf-8")
    )
    assert len(stations) == 3
    by_id = {s.id: s for s in stations}
    assert by_id[2].lat == 48.1372
    assert by_id[2].lon == 11.5755


def test_parse_monthly_normals_skips_sentinel_rows() -> None:
    rows = dwd.parse_monthly_normals(
        (FIXTURES / "temperature.txt").read_text(encoding="utf-8")
    )
    ids = {r.station_id for r in rows}
    assert ids == {1, 2, 3}
    assert all(len(r.values) == 12 for r in rows)


def test_assign_stations_uses_polygon_containment(tmp_path: Path) -> None:
    polygons = dwd.load_bundesland_polygons(_write_polygons(tmp_path))
    stations = dwd.parse_stations(
        (FIXTURES / "stations.txt").read_text(encoding="utf-8")
    )
    assignment = dwd.assign_stations_to_bundeslaender(stations, polygons)
    assert assignment["BW"] == [1]
    assert assignment["BY"] == [2]
    assert assignment["BE"] == [3]


def test_average_monthly_per_bundesland_means_across_stations(tmp_path: Path) -> None:
    polygons = dwd.load_bundesland_polygons(_write_polygons(tmp_path))
    stations = dwd.parse_stations((FIXTURES / "stations.txt").read_text(encoding="utf-8"))
    monthly = dwd.parse_monthly_normals(
        (FIXTURES / "temperature.txt").read_text(encoding="utf-8")
    )
    means = dwd.average_monthly_per_bundesland(
        dwd.assign_stations_to_bundeslaender(stations, polygons), monthly
    )
    # Each BL holds only one station in this fixture so the mean equals its values.
    assert means["BY"][0] == -1.20
    assert means["BE"][6] == 19.80


def test_shape_for_web_emits_per_bl_monthly_and_aggregates(tmp_path: Path) -> None:
    polygons = dwd.load_bundesland_polygons(_write_polygons(tmp_path))
    stations = dwd.parse_stations((FIXTURES / "stations.txt").read_text(encoding="utf-8"))
    assignment = dwd.assign_stations_to_bundeslaender(stations, polygons)
    temps = dwd.average_monthly_per_bundesland(
        assignment,
        dwd.parse_monthly_normals((FIXTURES / "temperature.txt").read_text(encoding="utf-8")),
    )
    precips = dwd.average_monthly_per_bundesland(
        assignment,
        dwd.parse_monthly_normals(
            (FIXTURES / "precipitation.txt").read_text(encoding="utf-8")
        ),
    )
    payload = dwd.shape_for_web(temps, precips)
    by = payload["byBundesland"]
    assert set(by.keys()) == {"BW", "BY", "BE"}
    by_bw = by["BW"]
    assert len(by_bw["monthly"]) == 12
    assert by_bw["meanTempC"] > 0
    assert by_bw["annualPrecipMm"] == 1015.0


def test_german_float_handles_sentinel_and_decimal_comma() -> None:
    assert dwd._german_float("9,5") == 9.5
    assert dwd._german_float("-999") is None
    assert dwd._german_float("  ") is None
    assert dwd._german_float("not-a-number") is None


# Keep the unused fixture path referenced so the import doesn't get pruned
_ = GERMANY_GEOJSON
