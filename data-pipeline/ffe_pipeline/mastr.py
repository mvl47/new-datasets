"""Placeholder for the MaStR fetcher.

Filled in by a follow-up commit. Today this module exposes the shape the
CLI calls (``run_mastr``) so ``ffe-pipeline mastr`` errors with a clear
message instead of an import error.
"""

from __future__ import annotations


def run_mastr(*, force: bool = False, sample: int | None = None) -> None:
    _ = force, sample
    raise NotImplementedError(
        "MaStR fetcher not implemented yet — coming in a follow-up commit."
    )
