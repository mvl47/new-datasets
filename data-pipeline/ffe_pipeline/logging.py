"""Pipeline logging — a single helper so every fetcher logs consistently."""

from __future__ import annotations

import logging
import os

_LEVEL = os.environ.get("FFE_LOG_LEVEL", "INFO").upper()
_FORMAT = "%(asctime)s %(levelname)-7s %(name)s | %(message)s"

logging.basicConfig(level=_LEVEL, format=_FORMAT, datefmt="%H:%M:%S")


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
