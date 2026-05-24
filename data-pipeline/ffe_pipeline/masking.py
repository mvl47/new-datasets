"""Polygon-on-grid masking utilities.

Given a flat 1-D lat/lon grid (ERA5 reanalysis: typically 0.25°) and the
BKG bundeslaender.geojson produced by ``boundaries.py``, decide which
grid cell falls inside which Bundesland polygon. The result is a sparse
mapping ``{code: list[(lat_idx, lon_idx)]}`` that downstream aggregators
turn into per-Bundesland time series with a couple of numpy gathers.

Implementation: a single shapely STRtree per BL polygon so the cost is
O(grid_cells × log(polygons)). For ERA5 over Germany that's < 50 ms
end-to-end — no need to pull in regionmask + cartopy.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from pathlib import Path
from typing import TYPE_CHECKING

from shapely.geometry import Point, shape
from shapely.geometry.base import BaseGeometry

if TYPE_CHECKING:
    import numpy as np

CellIndex = tuple[int, int]
GridMask = dict[str, list[CellIndex]]


def load_bundesland_polygons(geojson_path: Path) -> dict[str, BaseGeometry]:
    """Parse ``bundeslaender.geojson`` into ``{code: shapely_geometry}``."""
    with geojson_path.open("r", encoding="utf-8") as fp:
        payload = json.load(fp)
    polys: dict[str, BaseGeometry] = {}
    for feature in payload.get("features", []):
        props = feature.get("properties") or {}
        code = props.get("code")
        geom = feature.get("geometry")
        if not code or not isinstance(geom, dict):
            continue
        polys[code] = shape(geom)
    return polys


def build_grid_mask(
    polygons: Mapping[str, BaseGeometry],
    lats: np.ndarray,
    lons: np.ndarray,
) -> GridMask:
    """Assign every (lat, lon) cell to the Bundesland polygon containing it.

    Cells whose centre falls outside every Bundesland (sea, foreign soil)
    land in no bucket. A cell falling on a shared border is assigned to
    the first polygon that contains it — order-deterministic per the
    iteration order of ``polygons``.
    """
    mask: GridMask = {code: [] for code in polygons}
    for lat_idx, lat in enumerate(lats.tolist()):
        for lon_idx, lon in enumerate(lons.tolist()):
            pt = Point(float(lon), float(lat))
            for code, geom in polygons.items():
                if geom.contains(pt):
                    mask[code].append((lat_idx, lon_idx))
                    break
    return mask


def cell_count(mask: GridMask) -> dict[str, int]:
    return {code: len(cells) for code, cells in mask.items()}


def cells_to_index_arrays(
    mask: GridMask,
) -> dict[str, tuple[list[int], list[int]]]:
    """Reshape a GridMask into per-code ``(lat_idxs, lon_idxs)`` tuples
    that index ``data[time, lat, lon]`` with one fancy-indexing call.
    """
    out: dict[str, tuple[list[int], list[int]]] = {}
    for code, cells in mask.items():
        if not cells:
            continue
        lat_idxs = [c[0] for c in cells]
        lon_idxs = [c[1] for c in cells]
        out[code] = (lat_idxs, lon_idxs)
    return out
