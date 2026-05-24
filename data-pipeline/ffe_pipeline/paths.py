"""Filesystem paths used across the pipeline."""

from __future__ import annotations

import os
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PIPELINE_ROOT.parent

CACHE_DIR = PIPELINE_ROOT / "data" / "cache"
OUT_DIR = PIPELINE_ROOT / "data" / "out"

DEFAULT_WEB_OUTPUT = REPO_ROOT / "apps" / "web" / "public" / "data"


def output_dir() -> Path:
    """Resolve the directory where final artifacts land.

    Defaults to ``apps/web/public/data`` so Vite serves them at ``/data/*``.
    Override with the ``FFE_OUTPUT_DIR`` environment variable.
    """
    override = os.environ.get("FFE_OUTPUT_DIR")
    target = Path(override).expanduser().resolve() if override else DEFAULT_WEB_OUTPUT
    target.mkdir(parents=True, exist_ok=True)
    return target


def cache_dir(namespace: str | None = None) -> Path:
    """Per-source cache directory; created on demand."""
    target = CACHE_DIR if namespace is None else CACHE_DIR / namespace
    target.mkdir(parents=True, exist_ok=True)
    return target
