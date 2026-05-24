from __future__ import annotations

from pathlib import Path

from ffe_pipeline import mastr

FIXTURES = Path(__file__).parent / "fixtures" / "mastr"


def test_parse_einheiten_stream_drops_invalid_records() -> None:
    plants = list(mastr.parse_einheiten_stream(FIXTURES / "EinheitenSolar_test.xml", "solar"))
    ids = [p.id for p in plants]
    # raw fixture has 6 entries; expect 3 kept after status/null/off-Germany filters
    # (record 3 decommissioned, 4 null-island, 5 outside Germany)
    assert len(plants) == 3
    assert "SEE900000000" in ids[0]
    for p in plants:
        assert p.lon != 0
        assert p.lat != 0
        assert mastr._within_germany(p.lon, p.lat)


def test_dedupe_drops_neighbours_within_precision() -> None:
    plants = list(mastr.parse_einheiten_stream(FIXTURES / "EinheitenSolar_test.xml", "solar"))
    # Records 1 and 6 sit within ~10 m of each other → dedupe keeps the first.
    deduped = mastr.dedupe(plants, precision=3)
    assert len(deduped) == len(plants) - 1


def test_collect_from_dump_combines_tech_files() -> None:
    plants = mastr.collect_from_dump(FIXTURES)
    techs = {p.tech for p in plants}
    assert techs == {"solar", "wind"}
    assert len(plants) >= 4


def test_collect_from_dump_respects_sample_limit() -> None:
    plants = mastr.collect_from_dump(FIXTURES, sample=2)
    assert len(plants) == 2


def test_to_feature_collection_shape() -> None:
    plants = mastr.collect_from_dump(FIXTURES)
    fc = mastr.to_feature_collection(plants)
    assert fc["type"] == "FeatureCollection"
    for feature in fc["features"]:
        assert feature["geometry"]["type"] == "Point"
        coords = feature["geometry"]["coordinates"]
        assert mastr._within_germany(coords[0], coords[1])
        assert {"id", "tech", "capacityKw", "commissioningYear"} <= feature["properties"].keys()


def test_stats_counts_per_tech() -> None:
    plants = mastr.collect_from_dump(FIXTURES)
    s = mastr.stats(plants)
    assert s["solar"] >= 2
    assert s["wind"] == 2
