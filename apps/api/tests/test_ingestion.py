import errno
import importlib.util
from datetime import UTC, datetime
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from pydantic import ValidationError

from app.ingestion import BundleEmail, read_bundle

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BUNDLE_ROOT = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
RECEIVED_AT = datetime(2026, 9, 20, 12, tzinfo=UTC)


class MemoryInbox:
    def __init__(self, records: list[dict], files: dict[str, bytes]) -> None:
        self.records = records
        self.files = files
        self.read_paths: list[str] = []

    def emails(self) -> list[dict]:
        return self.records

    def read_bytes(self, path: str) -> bytes:
        self.read_paths.append(path)
        return self.files[path]


class LocalInbox:
    def __init__(self, root: Path, records: list[dict]) -> None:
        self.source = str(root)
        self.records = records

    def emails(self) -> list[dict]:
        return self.records

    def read_bytes(self, path: str) -> bytes:
        return (Path(self.source) / path).read_bytes()


def _record(**overrides) -> dict:
    record = {
        "email_id": "email_fixture",
        "from": "sender@example.com",
        "subject": "Subject",
        "body": "Body",
        "attachments": [],
    }
    record.update(overrides)
    return record


def _ooxml_bytes(kind: str) -> bytes:
    main_content_type = {
        "docx": b"wordprocessingml.document.main+xml",
        "xlsx": b"spreadsheetml.sheet.main+xml",
    }[kind]
    parts = {
        "[Content_Types].xml": b"<Types>" + main_content_type + b"</Types>",
        "docx": {"word/document.xml": b"<document/>"},
        "xlsx": {
            "xl/workbook.xml": b"<workbook/>",
            "xl/worksheets/sheet1.xml": b"<sheet/>",
        },
    }
    output = BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", parts["[Content_Types].xml"])
        for name, content in parts[kind].items():
            archive.writestr(name, content)
    return output.getvalue()


def _load_organizer_inbox():
    loader_path = BUNDLE_ROOT / "loader.py"
    spec = importlib.util.spec_from_file_location("organizer_loader", loader_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Inbox(str(BUNDLE_ROOT))


def test_real_bundle_retains_all_email_ids_and_attachments() -> None:
    received_at = datetime(2026, 9, 20, 12, tzinfo=UTC)

    emails = read_bundle(_load_organizer_inbox(), received_at=received_at)

    expected_ids = [f"email_{number:03}" for number in range(1, 521)]
    assert [email.email_id for email in emails] == expected_ids
    assert len({email.email_id for email in emails}) == 520
    assert sum(len(email.attachments) for email in emails) == 250
    assert all(email.received_at == received_at for email in emails)


def test_duplicate_content_emails_keep_distinct_source_ids() -> None:
    emails = read_bundle(
        _load_organizer_inbox(),
        received_at=datetime(2026, 9, 20, 12, tzinfo=UTC),
    )
    by_id = {email.email_id: email for email in emails}

    first = by_id["email_206"]
    second = by_id["email_450"]
    assert (first.sender, first.subject, first.body_text, first.attachments) == (
        second.sender,
        second.subject,
        second.body_text,
        second.attachments,
    )
    assert first.source_message_id == first.idempotency_key == "email_206"
    assert second.source_message_id == second.idempotency_key == "email_450"
    assert first.message_hash != second.message_hash


def test_bundle_email_rejects_unknown_and_missing_record_fields() -> None:
    with pytest.raises(ValidationError):
        BundleEmail.model_validate({**_record(), "unexpected": "value"})

    missing_body = _record()
    del missing_body["body"]
    with pytest.raises(ValidationError):
        BundleEmail.model_validate(missing_body)


@pytest.mark.parametrize(
    "record",
    [
        _record(email_id="  "),
        _record(**{"from": "\t"}),
        _record(attachments="attachments/file.txt"),
        _record(attachments=["attachments/file.txt", 3]),
    ],
)
def test_reader_rejects_blank_identifiers_and_malformed_attachments(
    record: dict,
) -> None:
    inbox = MemoryInbox([record], {})

    with pytest.raises((ValidationError, ValueError)):
        read_bundle(inbox, received_at=RECEIVED_AT)

    assert inbox.read_paths == []


@pytest.mark.parametrize(
    "path",
    [
        "../attachments/file.txt",
        "attachments/../outside.txt",
        "/attachments/file.txt",
        "C:/attachments/file.txt",
        "attachments\\file.txt",
        "attachments//file.txt",
        "attachments/%2e%2e/outside.txt",
        "attachments/%2E%2E/outside.txt",
        "attachments/report.txt?download=1",
        "attachments/report.txt#fragment",
    ],
)
def test_reader_rejects_unsafe_attachment_paths_before_reading(path: str) -> None:
    inbox = MemoryInbox([_record(attachments=[path])], {})

    with pytest.raises(ValueError):
        read_bundle(inbox, received_at=RECEIVED_AT)

    assert inbox.read_paths == []


def test_reader_rejects_duplicate_attachment_paths_before_reading() -> None:
    path = "attachments/file.txt"
    inbox = MemoryInbox([_record(attachments=[path, path])], {path: b"same"})

    with pytest.raises(ValueError):
        read_bundle(inbox, received_at=RECEIVED_AT)

    assert inbox.read_paths == []


def test_reader_rejects_duplicate_email_ids_before_reading() -> None:
    inbox = MemoryInbox([_record(), _record()], {})

    with pytest.raises(ValueError):
        read_bundle(inbox, received_at=RECEIVED_AT)

    assert inbox.read_paths == []


def test_reader_rejects_missing_attachment_bytes() -> None:
    inbox = MemoryInbox([_record(attachments=["attachments/missing.txt"])], {})

    with pytest.raises((FileNotFoundError, ValueError)):
        read_bundle(inbox, received_at=RECEIVED_AT)


def test_reader_rejects_non_bytes_attachment_results() -> None:
    path = "attachments/file.txt"
    inbox = MemoryInbox(
        [_record(attachments=[path])],
        {path: "not bytes"},  # type: ignore[dict-item]
    )

    with pytest.raises(TypeError, match="did not return bytes"):
        read_bundle(inbox, received_at=RECEIVED_AT)


def test_message_hash_uses_canonical_unicode_json_and_email_id() -> None:
    record = _record(email_id="mail-1", body="你好\n")
    expected_message = (
        '{"attachments":[],"body":"你好\\n","email_id":"mail-1",'
        '"from":"sender@example.com","subject":"Subject"}'
    ).encode()

    email = read_bundle(MemoryInbox([record], {}), received_at=RECEIVED_AT)[0]

    assert email.message_bytes == expected_message
    assert email.message_hash == sha256(expected_message).hexdigest()
    assert email.source_message_id == email.idempotency_key == "mail-1"


def test_received_at_must_be_injected_as_utc() -> None:
    inbox = MemoryInbox([_record()], {})

    with pytest.raises(ValueError):
        read_bundle(inbox, received_at=datetime.fromisoformat("2026-09-20T12:00:00"))
    with pytest.raises(ValueError):
        read_bundle(
            inbox,
            received_at=datetime.fromisoformat("2026-09-20T12:00:00+08:00"),
        )


def test_reader_requires_explicit_received_at() -> None:
    with pytest.raises(TypeError):
        read_bundle(MemoryInbox([_record()], {}))  # type: ignore[call-arg]


def test_attachment_receipt_preserves_bytes_hash_size_and_ordinal() -> None:
    text_path = "attachments/first.txt"
    pdf_path = "attachments/second.pdf"
    text_bytes = "收货人\tWilly\n".encode()
    pdf_bytes = b"%PDF-1.7\nbody\n%%EOF\n"
    inbox = MemoryInbox(
        [_record(attachments=[text_path, pdf_path])],
        {text_path: text_bytes, pdf_path: pdf_bytes},
    )

    email = read_bundle(inbox, received_at=RECEIVED_AT)[0]

    first, second = email.attachments
    assert inbox.read_paths == [text_path, pdf_path]
    assert (first.ordinal, second.ordinal) == (1, 2)
    assert first.filename == "first.txt"
    assert first.data == text_bytes
    assert first.byte_size == len(text_bytes)
    assert first.content_hash == sha256(text_bytes).hexdigest()
    assert first.detected_format == "txt"
    assert first.declared_mime is None
    assert second.data == pdf_bytes
    assert second.byte_size == len(pdf_bytes)
    assert second.content_hash == sha256(pdf_bytes).hexdigest()
    assert second.detected_format == "pdf"
    assert second.declared_mime is None


@pytest.mark.parametrize(
    ("path", "data"),
    [
        ("attachments/wrong.pdf", b"ordinary text"),
        ("attachments/wrong.txt", b"%PDF-1.7\nbody\n%%EOF\n"),
        ("attachments/wrong.docx", _ooxml_bytes("xlsx")),
        ("attachments/broken.xlsx", b"not a zip workbook"),
    ],
)
def test_reader_rejects_extension_and_content_disagreement(
    path: str, data: bytes
) -> None:
    inbox = MemoryInbox([_record(attachments=[path])], {path: data})

    with pytest.raises(ValueError):
        read_bundle(inbox, received_at=RECEIVED_AT)


def test_reader_detects_docx_xlsx_containers_and_unknown_binary() -> None:
    paths = [
        "attachments/document.docx",
        "attachments/workbook.xlsx",
        "attachments/archive.bin",
    ]
    contents = [_ooxml_bytes("docx"), _ooxml_bytes("xlsx"), b"\x00\xff\x10"]
    inbox = MemoryInbox([_record(attachments=paths)], dict(zip(paths, contents)))

    attachments = read_bundle(inbox, received_at=RECEIVED_AT)[0].attachments

    assert [attachment.detected_format for attachment in attachments] == [
        "docx",
        "xlsx",
        "unknown",
    ]
    assert [attachment.declared_mime for attachment in attachments] == [
        None,
        None,
        None,
    ]


def test_repeated_bundle_reads_return_stable_attachment_bytes_and_hashes() -> None:
    path = "attachments/file.txt"
    inbox = MemoryInbox([_record(attachments=[path])], {path: b"stable bytes"})

    first = read_bundle(inbox, received_at=RECEIVED_AT)[0]
    second = read_bundle(inbox, received_at=RECEIVED_AT)[0]

    assert first.message_hash == second.message_hash
    assert first.attachments[0].data == second.attachments[0].data == b"stable bytes"
    assert first.attachments[0].content_hash == second.attachments[0].content_hash


def test_reader_rejects_local_symlink_attachments() -> None:
    api_root = REPOSITORY_ROOT / "apps" / "api"
    linked_attachment_root = api_root / "attachments"
    if linked_attachment_root.exists() or linked_attachment_root.is_symlink():
        pytest.fail(f"test symlink path already exists: {linked_attachment_root}")
    try:
        linked_attachment_root.symlink_to(
            BUNDLE_ROOT / "attachments",
            target_is_directory=True,
        )
    except NotImplementedError as error:
        pytest.skip(f"filesystem symlink creation is unavailable: {error}")
    except OSError as error:
        if (
            error.errno in {errno.EACCES, errno.EPERM}
            or getattr(error, "winerror", None) == 1314
        ):
            pytest.skip(f"filesystem symlink creation is unavailable: {error}")
        raise

    try:
        inbox = LocalInbox(
            api_root,
            [_record(attachments=["attachments/email_001_SI.txt"])],
        )
        with pytest.raises(ValueError):
            read_bundle(inbox, received_at=RECEIVED_AT)
    finally:
        linked_attachment_root.unlink()
