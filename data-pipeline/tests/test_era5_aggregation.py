from __future__ import annotations

import numpy as np

from ffe_pipeline import era5


def test_load_wind_capacities_matches_config() -> None:
    caps = era5.load_capacities(era5.WIND_CAPACITY_FILE)
    assert "NI" in caps
    assert caps["NI"] > caps["SL"]


def test_load_pv_capacities_matches_config() -> None:
    caps = era5.load_capacities(era5.PV_CAPACITY_FILE)
    assert caps["BY"] > caps["HB"]
    assert caps["BY"] > 10_000


def test_aggregate_per_bundesland_wind_uses_mean_speed_and_capacity() -> None:
    # 3 hours, 2 lat × 2 lon, code BY owns cells (0,0) and (1,1) → mean of those.
    n_t = 3
    speed = np.zeros((n_t, 2, 2))
    speed[:, 0, 0] = [4.0, 12.0, 25.0]
    speed[:, 1, 1] = [6.0, 12.0, 25.0]
    cell_index = {"BY": ([0, 1], [0, 1])}
    capacities = {"BY": 1000.0}
    out = era5.aggregate_per_bundesland_wind(speed, cell_index, capacities)
    expected_speed = np.array([5.0, 12.0, 25.0])
    expected_cf = era5.wind_power_curve(expected_speed)
    np.testing.assert_allclose(out["BY"], expected_cf * 1000.0)


def test_aggregate_per_bundesland_wind_zeros_missing_codes() -> None:
    speed = np.zeros((2, 1, 1))
    out = era5.aggregate_per_bundesland_wind(
        speed,
        {"BY": ([0], [0])},
        capacities={},
    )
    np.testing.assert_array_equal(out["BY"], np.zeros(2))


def test_aggregate_per_bundesland_pv_with_clear_sky() -> None:
    # 800 W/m² * 3600 s = 2.88 MJ/m² accumulated per hour
    ssrd = np.full((2, 1, 1), 800.0 * 3600.0)
    out = era5.aggregate_per_bundesland_pv(
        ssrd,
        {"BY": ([0], [0])},
        capacities={"BY": 10_000.0},
    )
    expected_cf = era5.pv_capacity_factor(np.array([800.0 * 3600.0, 800.0 * 3600.0]))
    np.testing.assert_allclose(out["BY"], expected_cf * 10_000.0)


def test_aggregate_per_bundesland_pv_night_returns_zero() -> None:
    ssrd = np.zeros((4, 1, 1))
    out = era5.aggregate_per_bundesland_pv(
        ssrd, {"BY": ([0], [0])}, capacities={"BY": 1000.0}
    )
    np.testing.assert_array_equal(out["BY"], np.zeros(4))
