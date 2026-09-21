"""The control graph: the whole corpus, and grounded chat against it."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import GraphChatDep, GuestDep, SeedCatalogDep
from app.graph_chat import ChatRequest, build_corpus
from app.observability import bind_request_context
from app.seed_catalog import SEED_VERSION

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/corpus")
async def read_corpus(
    request: Request, guest: GuestDep, catalog: SeedCatalogDep
) -> dict[str, object]:
    bind_request_context(request, route_choice=catalog.decision_source.upper())
    corpus = build_corpus(catalog)
    return {
        "source": catalog.decision_source,
        "version": SEED_VERSION,
        "nodes": [node.model_dump() for node in corpus.nodes],
        "edges": [edge.model_dump() for edge in corpus.edges],
    }


@router.post("/chat")
async def chat(
    body: ChatRequest,
    request: Request,
    guest: GuestDep,
    chat_service: GraphChatDep,
    catalog: SeedCatalogDep,
) -> dict[str, object]:
    bind_request_context(request, route_choice="LIVE")
    return await chat_service.answer(body.question, body.history or (), catalog)
