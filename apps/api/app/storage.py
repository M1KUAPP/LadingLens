from __future__ import annotations

import asyncio
from collections.abc import Mapping
from hashlib import sha256
from re import fullmatch
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


def artifact_object_key(content_hash: str) -> str:
    _validate_sha256(content_hash)
    return f"submission-artifacts/{content_hash[:2]}/{content_hash}.json"


class PrivateObjectStore(Protocol):
    async def put_if_absent(self, content_hash: str, data: bytes) -> str: ...

    async def put_artifact_if_absent(self, content_hash: str, data: bytes) -> str: ...

    async def read_private(self, key: str) -> bytes: ...


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

    async def put_artifact_if_absent(self, content_hash: str, data: bytes) -> str:
        _validate_hash(content_hash, data)
        key = artifact_object_key(content_hash)
        self._objects.setdefault(key, data)
        return key

    async def read_private(self, key: str) -> bytes:
        _validate_private_key(key)
        return self._objects[key]

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

        await self._upload_if_absent(key, data)
        return key

    async def put_artifact_if_absent(self, content_hash: str, data: bytes) -> str:
        _validate_hash(content_hash, data)
        key = artifact_object_key(content_hash)

        await self._upload_if_absent(key, data)
        return key

    async def read_private(self, key: str) -> bytes:
        _validate_private_key(key)

        def download() -> bytes:
            return self._bucket.blob(key).download_as_bytes()

        return await asyncio.to_thread(download)

    async def _upload_if_absent(self, key: str, data: bytes) -> None:

        def upload() -> None:
            blob = self._bucket.blob(key)
            try:
                blob.upload_from_string(
                    data,
                    if_generation_match=0,
                )
            except PreconditionFailed:
                existing = blob.download_as_bytes()
                if existing != data:
                    raise ValueError(
                        "existing content-addressed object has different bytes"
                    )

        await asyncio.to_thread(upload)


def _validate_hash(content_hash: str, data: bytes) -> None:
    _validate_sha256(content_hash)
    if sha256_hex(data) != content_hash:
        raise ValueError("content_hash does not match the supplied bytes")


def _validate_sha256(content_hash: str) -> None:
    if fullmatch(r"[0-9a-f]{64}", content_hash) is None:
        raise ValueError("content_hash must be a lowercase SHA-256 hex digest")


def _validate_private_key(key: str) -> None:
    if fullmatch(r"source-objects/[0-9a-f]{2}/[0-9a-f]{64}", key):
        return
    if fullmatch(r"submission-artifacts/[0-9a-f]{2}/[0-9a-f]{64}\.json", key):
        return
    raise ValueError("key is not a valid private object key")
