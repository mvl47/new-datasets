from __future__ import annotations

import numpy as np

from ffe_pipeline import era5


def test_build_request_covers_full_year_and_germany_bbox() -> None:
    body = era5.build_request(2023, era5.WIND_VARIABLES)
    assert body["year"] == "2023"
    assert body["variable"] == era5.WIND_VARIABLES
    assert len(body["month"]) == 12
    assert len(body["day"]) == 31
    assert len(body["time"]) == 24
    assert body["area"] == era5.GERMANY_BBOX_CDS
    assert body["format"] == "netcdf"


def test_wind_speed_pythagoras() -> None:
    u = np.array([3.0, 0.0, -4.0])
    v = np.array([4.0, 5.0, 3.0])
    speed = era5.wind_speed(u, v)
    np.testing.assert_allclose(speed, [5.0, 5.0, 5.0])


def test_wind_power_curve_known_points() -> None:
    speed = np.array([0.0, 2.5, 3.0, 7.5, 12.0, 18.0, 25.0, 30.0])
    cf = era5.wind_power_curve(speed)
    assert cf[0] == 0.0
    assert cf[1] == 0.0
    assert cf[2] == 0.0
    assert 0.0 < cf[3] < 1.0
    assert cf[4] == 1.0
    assert cf[5] == 1.0
    assert cf[6] == 0.0
    assert cf[7] == 0.0
    expected_ramp = ((7.5 - 3.0) / (12.0 - 3.0)) ** 3
    np.testing.assert_allclose(cf[3], expected_ramp)


def test_wind_power_curve_is_clipped() -> None:
    speed = np.linspace(-5, 40, 100)
    cf = era5.wind_power_curve(speed)
    assert cf.min() >= 0.0
    assert cf.max() <= 1.0


def test_pv_capacity_factor_clear_sky() -> None:
    # 800 W/m² peak summer noon → ~80% of clear-sky standard
    ssrd_peak_summer = np.array([800.0 * 3600.0])
    cf = era5.pv_capacity_factor(ssrd_peak_summer, panel_efficiency=0.20, performance_ratio=0.85)
    np.testing.assert_allclose(cf, [0.8 * 0.85], rtol=1e-6)


def test_pv_capacity_factor_night() -> None:
    cf = era5.pv_capacity_factor(np.zeros(5))
    np.testing.assert_array_equal(cf, np.zeros(5))


def test_to_timeseries_payload_shape() -> None:
    by_bl = {
        "BY": np.array([10.0, 20.5, 30.123]),
        "BW": np.array([0.0, 5.0, 10.0]),
    }
    national = np.array([10.0, 25.5, 40.123])
    payload = era5.to_timeseries_payload(by_bl, national)
    assert payload["hoursInYear"] == 3
    assert payload["byBundesland"]["BY"] == [10.0, 20.5, 30.1]
    assert payload["national"] == [10.0, 25.5, 40.1]


def test_run_era5_does_not_import_cdsapi_unless_called() -> None:
    """Importing the module should not require optional ERA5 deps.

    The user-facing fetcher is guarded by ImportError with a helpful
    message, but ``import ffe_pipeline.era5`` itself must succeed in a
    minimal env (this very test environment).
    """
    assert callable(era5.run_era5)
    assert callable(era5.build_request)
    assert callable(era5.wind_power_curve)
