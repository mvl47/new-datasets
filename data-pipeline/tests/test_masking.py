from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from ffe_pipeline import masking


def _fixture_germany(tmp_path: Path) -> Path:
    """Tiny 2-polygon FeatureCollection covering Bayern + Berlin bounding boxes."""
    payload = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"code": "BY", "name": "Bayern"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [10.0, 47.5],
                            [13.5, 47.5],
                            [13.5, 50.5],
                            [10.0, 50.5],
                            [10.0, 47.5],
                        ]
                    ],
                },
            },
            {
                "type": "Feature",
                "properties": {"code": "BE", "name": "Berlin"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [13.1, 52.4],
                            [13.7, 52.4],
                            [13.7, 52.7],
                            [13.1, 52.7],
                            [13.1, 52.4],
                        ]
                    ],
                },
            },
        ],
    }
    path = tmp_path / "bundeslaender.geojson"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_load_bundesland_polygons_parses_features(tmp_path: Path) -> None:
    polys = masking.load_bundesland_polygons(_fixture_germany(tmp_path))
    assert set(polys.keys()) == {"BY", "BE"}
    assert polys["BY"].contains_properly  # shapely Polygon


def test_build_grid_mask_assigns_cells_to_containing_polygon(tmp_path: Path) -> None:
    polys = masking.load_bundesland_polygons(_fixture_germany(tmp_path))
    # 3x3 grid mixing inside / outside cells per Bundesland.
    lats = np.array([48.0, 52.5, 60.0])
    lons = np.array([11.5, 13.4, 0.0])
    mask = masking.build_grid_mask(polys, lats, lons)
    counts = masking.cell_count(mask)
    # BY (lat 47.5–50.5, lon 10–13.5) catches (48.0, 11.5) and (48.0, 13.4)
    assert counts["BY"] == 2
    # BE (lat 52.4–52.7, lon 13.1–13.7) catches (52.5, 13.4) only
    assert counts["BE"] == 1
    # everything else lands in neither
    assert sum(counts.values()) == 3


def test_cells_to_index_arrays_drops_empty_codes(tmp_path: Path) -> None:
    polys = masking.load_bundesland_polygons(_fixture_germany(tmp_path))
    lats = np.array([48.0])
    lons = np.array([11.5])  # only one cell, lands in BY
    mask = masking.build_grid_mask(polys, lats, lons)
    idx = masking.cells_to_index_arrays(mask)
    assert "BE" not in idx
    assert idx["BY"] == ([0], [0])
