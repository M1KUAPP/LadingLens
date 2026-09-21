"""The public /judge page: live checks of an uploaded pair, and the fallback."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, Request, Response, UploadFile

from app.api.deps import GuestDep, JudgeDep, SeedCatalogDep, ServicesDep
from app.api.evidence import inline_file_response
from app.judge import ACCEPTED_FORMATS, fallback
from app.observability import bind_request_context

router = APIRouter(prefix="/api/judge", tags=["judge"])


@router.get("/policy")
async def read_policy(guest: GuestDep, services: ServicesDep) -> dict[str, object]:
    return {
        "accepted_formats": list(ACCEPTED_FORMATS),
        "max_file_bytes": services.settings.max_upload_bytes,
        "data_policy": services.settings.data_policy,
        "confirmation_required": True,
    }


@router.post("/runs", status_code=201)
async def create_run(
    request: Request,
    guest: GuestDep,
    judge: JudgeDep,
    files: Annotated[list[UploadFile] | None, File()] = None,
    si_file: Annotated[UploadFile | None, File()] = None,
    draft_bl_file: Annotated[UploadFile | None, File()] = None,
    synthetic_confirmed: Annotated[str | None, Form()] = None,
) -> dict[str, object]:
    return await judge.upload(
        guest,
        files=files,
        si=si_file,
        draft_bl=draft_bl_file,
        synthetic_confirmed=(synthetic_confirmed or "").strip().lower() == "true",
        request=request,
    )


@router.get("/runs")
async def list_runs(
    request: Request, guest: GuestDep, judge: JudgeDep
) -> dict[str, object]:
    return {"runs": await judge.list(guest, request=request)}


@router.get("/runs/{run_id}")
async def read_run(
    run_id: str, request: Request, guest: GuestDep, judge: JudgeDep
) -> dict[str, object]:
    return await judge.get(guest, run_id, request=request)


@router.post("/runs/{run_id}/retry")
async def retry_run(
    run_id: str, request: Request, guest: GuestDep, judge: JudgeDep
) -> dict[str, object]:
    return await judge.retry(guest, run_id, request=request)


@router.get("/runs/{run_id}/documents/{document_id}")
async def read_run_document(
    run_id: str,
    document_id: str,
    request: Request,
    guest: GuestDep,
    judge: JudgeDep,
) -> Response:
    data, file_name, detected_format = await judge.document(
        guest, run_id, document_id, request=request
    )
    return inline_file_response(
        data, file_name=file_name, detected_format=detected_format
    )


@router.get("/fallback")
async def read_fallback(
    request: Request, guest: GuestDep, catalog: SeedCatalogDep
) -> dict[str, object]:
    email = catalog.emails[catalog.fallback_email_id]
    bind_request_context(
        request,
        case_ids=(email.case.case_id,),
        source_hashes=(email.message_hash,),
        route_choice="PREPARED",
    )
    return fallback(catalog)
