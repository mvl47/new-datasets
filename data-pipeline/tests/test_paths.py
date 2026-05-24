from __future__ import annotations

from pathlib import Path

import pytest

from ffe_pipeline import paths


def test_output_dir_defaults_to_web_public(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FFE_OUTPUT_DIR", raising=False)
    target = paths.output_dir()
    assert target == paths.DEFAULT_WEB_OUTPUT
    assert target.exists()


def test_output_dir_respects_env_override(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    override = tmp_path / "custom-out"
    monkeypatch.setenv("FFE_OUTPUT_DIR", str(override))
    target = paths.output_dir()
    assert target == override
    assert target.is_dir()


def test_cache_dir_is_per_namespace_and_created() -> None:
    a = paths.cache_dir("bkg")
    b = paths.cache_dir("mastr")
    assert a != b
    assert a.is_dir()
    assert b.is_dir()
    assert a.parent == paths.CACHE_DIR
