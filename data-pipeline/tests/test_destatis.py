from __future__ import annotations

from pathlib import Path

import pytest
import responses

from ffe_pipeline import destatis

FIXTURE = Path(__file__).parent / "fixtures" / "destatis" / "12411-0010.ffcsv"


def test_parse_population_ffcsv_emits_per_bundesland_series() -> None:
    series = destatis.parse_population_ffcsv(FIXTURE.read_text(encoding="utf-8"))
    assert set(series.keys()) == {"SH", "HH", "BW", "BY", "BE"}
    assert series["BY"][2010] == 12_538_696
    assert series["SH"][2011] == 2_834_260
    assert 2010 in series["BE"]
    assert 2011 in series["BE"]


def test_parse_population_ffcsv_skips_unknown_codes_and_blank_values() -> None:
    series = destatis.parse_population_ffcsv(FIXTURE.read_text(encoding="utf-8"))
    assert "FOO" not in series
    assert "99" not in series


def test_shape_for_web_aligns_years_across_codes() -> None:
    series = destatis.parse_population_ffcsv(FIXTURE.read_text(encoding="utf-8"))
    payload = destatis.shape_for_web(series)
    assert payload["years"] == [2010, 2011]
    assert len(payload["byBundesland"]["BY"]) == len(payload["years"])
    # values stored in thousands for the web layer
    assert payload["byBundesland"]["BY"][0] == 12_539
    assert payload["byBundesland"]["SH"][1] == 2_834


def test_credentials_from_env_prefers_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DESTATIS_API_TOKEN", "abc123")
    creds = destatis.Credentials.from_env()
    assert creds.token == "abc123"
    assert creds.query() == {"username": "abc123"}


def test_credentials_from_env_falls_back_to_anonymous(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DESTATIS_API_TOKEN", raising=False)
    monkeypatch.delenv("DESTATIS_USERNAME", raising=False)
    monkeypatch.delenv("DESTATIS_PASSWORD", raising=False)
    creds = destatis.Credentials.from_env()
    assert creds.query() == {"username": "anonymous", "password": ""}


@responses.activate
def test_fetch_table_ffcsv_uses_cache_on_repeat_call(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from ffe_pipeline import paths

    monkeypatch.setattr(paths, "CACHE_DIR", tmp_path / "cache")  # type: ignore[arg-type]
    monkeypatch.delenv("DESTATIS_API_TOKEN", raising=False)
    body = FIXTURE.read_text(encoding="utf-8")
    responses.add(
        responses.GET,
        destatis.DEFAULT_ENDPOINT,
        body=body,
        status=200,
    )

    first = destatis.fetch_table_ffcsv("12411-0010")
    assert "Bayern" in first
    second = destatis.fetch_table_ffcsv("12411-0010")
    assert second == first
    assert len(responses.calls) == 1
