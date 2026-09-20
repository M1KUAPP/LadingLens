from hashlib import sha256

import pytest
from google.api_core.exceptions import PreconditionFailed

from app.storage import (
    GcsPrivateObjectStore,
    InMemoryPrivateObjectStore,
    private_object_key,
    sha256_hex,
)


def test_sha256_hex_hashes_exact_bytes() -> None:
    payload = b"same visible text\r\nwith exact bytes"

    assert sha256_hex(payload) == sha256(payload).hexdigest()


def test_private_object_key_is_opaque_and_content_addressed() -> None:
    content_hash = "a" * 64

    key = private_object_key(content_hash)

    assert key == f"source-objects/aa/{content_hash}"
    assert not key.startswith(("http://", "https://", "gs://"))


@pytest.mark.asyncio
async def test_memory_store_preserves_bytes_and_deduplicates() -> None:
    store = InMemoryPrivateObjectStore()
    payload = b"private attachment bytes"
    content_hash = sha256_hex(payload)

    first_key = await store.put_if_absent(content_hash, payload)
    second_key = await store.put_if_absent(content_hash, payload)

    assert first_key == second_key
    assert store.read(first_key) == payload
    assert len(store.objects) == 1


@pytest.mark.asyncio
async def test_memory_store_rejects_hash_mismatch() -> None:
    store = InMemoryPrivateObjectStore()

    with pytest.raises(ValueError, match="does not match"):
        await store.put_if_absent("0" * 64, b"different")


@pytest.mark.asyncio
async def test_gcs_store_uses_create_only_private_object_upload() -> None:
    class FakeBlob:
        def __init__(self) -> None:
            self.calls: list[tuple[bytes, int]] = []
            self.already_exists = False

        def upload_from_string(self, data: bytes, *, if_generation_match: int) -> None:
            self.calls.append((data, if_generation_match))
            if self.already_exists:
                raise PreconditionFailed("already exists")

    class FakeBucket:
        def __init__(self) -> None:
            self.requested_keys: list[str] = []
            self.fake_blob = FakeBlob()

        def blob(self, key: str) -> FakeBlob:
            self.requested_keys.append(key)
            return self.fake_blob

    class FakeClient:
        def __init__(self) -> None:
            self.fake_bucket = FakeBucket()
            self.requested_bucket: str | None = None

        def bucket(self, name: str) -> FakeBucket:
            self.requested_bucket = name
            return self.fake_bucket

    client = FakeClient()
    store = GcsPrivateObjectStore("private-bucket", client=client)  # type: ignore[arg-type]
    payload = b"private gcs bytes"
    content_hash = sha256_hex(payload)

    key = await store.put_if_absent(content_hash, payload)
    client.fake_bucket.fake_blob.already_exists = True
    replay_key = await store.put_if_absent(content_hash, payload)

    assert client.requested_bucket == "private-bucket"
    assert key == replay_key == private_object_key(content_hash)
    assert client.fake_bucket.requested_keys == [key, key]
    assert client.fake_bucket.fake_blob.calls == [(payload, 0), (payload, 0)]
