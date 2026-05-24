"""HTTP helpers with on-disk caching.

Every fetch is content-addressable by URL: a second run skips the network
unless the cached file is missing or ``force=True``. Big files stream to
disk with a tqdm progress bar.
"""

from __future__ import annotations

import hashlib
import shutil
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlparse

import requests
from tqdm import tqdm

from .logging import get_logger
from .paths import cache_dir

log = get_logger(__name__)

DEFAULT_TIMEOUT = 60
CHUNK_SIZE = 1 << 16  # 64 KiB


def _cache_key(url: str) -> str:
    """Stable filename: ``<basename>-<sha8>.<ext>``."""
    name = Path(urlparse(url).path).name or "download.bin"
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:8]
    stem = Path(name).stem
    suffix = "".join(Path(name).suffixes)
    return f"{stem}-{digest}{suffix}"


def download(url: str, namespace: str, *, force: bool = False, timeout: int = DEFAULT_TIMEOUT) -> Path:
    """Download ``url`` to the namespaced cache. Return the local path."""
    target = cache_dir(namespace) / _cache_key(url)
    if target.exists() and not force:
        log.info("cache hit: %s (%s bytes)", target.name, target.stat().st_size)
        return target

    log.info("GET %s", url)
    with requests.get(url, stream=True, timeout=timeout) as response:
        response.raise_for_status()
        total = int(response.headers.get("Content-Length", 0)) or None
        with tempfile.NamedTemporaryFile(delete=False, dir=target.parent) as tmp, tqdm(
            total=total,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
            desc=target.name,
            leave=False,
        ) as bar:
            tmp_path = Path(tmp.name)
            try:
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        tmp.write(chunk)
                        bar.update(len(chunk))
            except Exception:
                tmp_path.unlink(missing_ok=True)
                raise
    tmp_path.replace(target)
    log.info("cached %s (%s bytes)", target.name, target.stat().st_size)
    return target


@contextmanager
def unpacked(archive: Path) -> Iterator[Path]:
    """Extract ``archive`` into a temp directory; yield the directory.

    Cleaned up on exit. Supports any format ``shutil.unpack_archive``
    handles (zip, tar, etc.).
    """
    with tempfile.TemporaryDirectory(prefix="ffe-unpack-") as raw:
        out = Path(raw)
        shutil.unpack_archive(str(archive), str(out))
        yield out
