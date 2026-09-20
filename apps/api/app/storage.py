from __future__ import annotations

import asyncio
from collections.abc import Mapping
from hashlib import sha256
from typing import Protocol

from google.api_core.exceptions import PreconditionFailed
from google.cloud import storage


def sha256_hex(data: bytes) -> str:
    return sha256(data).hexdigest()


def private_object_key(content_hash: str) -> str:
    if len(content_hash) != 64 or any(
        character not in "0123456789abcdef" for character in content_hash
    ):
        raise ValueError("content_hash must be a lowercase SHA-256 hex digest")
    return f"source-objects/{content_hash[:2]}/{content_hash}"


class PrivateObjectStore(Protocol):
    async def put_if_absent(self, content_hash: str, data: bytes) -> str: ...


class InMemoryPrivateObjectStore:
    def __init__(self) -> None:
        self._objects: dict[str, bytes] = {}

    @property
    def objects(self) -> Mapping[str, bytes]:
        return self._objects.copy()

    async def put_if_absent(self, content_hash: str, data: bytes) -> str:
        _validate_hash(content_hash, data)
        key = private_object_key(content_hash)
        self._objects.setdefault(key, data)
        return key

    def read(self, key: str) -> bytes:
        return self._objects[key]


class GcsPrivateObjectStore:
    def __init__(
        self,
        bucket_name: str,
        *,
        client: storage.Client | None = None,
    ) -> None:
        if not bucket_name.strip():
            raise ValueError("bucket_name must not be empty")
        self._bucket = (client or storage.Client()).bucket(bucket_name)

    async def put_if_absent(self, content_hash: str, data: bytes) -> str:
        _validate_hash(content_hash, data)
        key = private_object_key(content_hash)

        def upload() -> None:
            try:
                self._bucket.blob(key).upload_from_string(
                    data,
                    if_generation_match=0,
                )
            except PreconditionFailed:
                # Content-addressing makes an existing object with this key the
                # successful result of the same exact-byte upload.
                return

        await asyncio.to_thread(upload)
        return key


def _validate_hash(content_hash: str, data: bytes) -> None:
    private_object_key(content_hash)
    if sha256_hex(data) != content_hash:
        raise ValueError("content_hash does not match the supplied bytes")
