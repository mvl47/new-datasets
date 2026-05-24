from __future__ import annotations

import pytest
import responses

from ffe_pipeline import http, paths


@pytest.fixture
def isolated_cache(monkeypatch: pytest.MonkeyPatch, tmp_path: pytest.TempPathFactory) -> None:
    monkeypatch.setattr(paths, "CACHE_DIR", tmp_path / "cache")  # type: ignore[arg-type]
    return tmp_path  # type: ignore[return-value]


@responses.activate
def test_download_caches_after_first_call(isolated_cache: object) -> None:  # noqa: ARG001
    url = "https://example.test/foo.bin"
    responses.add(responses.GET, url, body=b"hello-world", status=200)

    local = http.download(url, namespace="ns")
    assert local.exists()
    assert local.read_bytes() == b"hello-world"

    again = http.download(url, namespace="ns")
    assert again == local
    assert len(responses.calls) == 1


@responses.activate
def test_download_force_bypasses_cache(isolated_cache: object) -> None:  # noqa: ARG001
    url = "https://example.test/foo.bin"
    responses.add(responses.GET, url, body=b"first", status=200)
    responses.add(responses.GET, url, body=b"second", status=200)

    http.download(url, namespace="ns")
    second = http.download(url, namespace="ns", force=True)
    assert second.read_bytes() == b"second"
    assert len(responses.calls) == 2


def test_cache_key_is_stable_and_url_unique() -> None:
    a = http._cache_key("https://x.test/foo.zip")
    b = http._cache_key("https://x.test/foo.zip")
    c = http._cache_key("https://x.test/foo.zip?v=2")
    assert a == b
    assert a != c
    assert a.endswith(".zip")
