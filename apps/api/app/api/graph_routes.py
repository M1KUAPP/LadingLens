"""The control graph: a bounded view for the canvas, and grounded chat."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request

from app.api.deps import GraphChatDep, GuestDep, SeedCatalogDep
from app.graph_chat import ChatRequest, build_corpus, corpus_overview
from app.observability import bind_request_context
from app.seed_catalog import SEED_VERSION

router = APIRouter(prefix="/api/graph", tags=["graph"])

Scope = Literal["overview", "full"]


@router.get("/corpus")
async def read_corpus(
    request: Request,
    guest: GuestDep,
    catalog: SeedCatalogDep,
    scope: Scope = "overview",
) -> dict[str, object]:
    bind_request_context(request, route_choice=catalog.decision_source.upper())
    corpus = build_corpus(catalog)
    if scope == "overview":
        corpus = corpus_overview(corpus)
    return {
        "source": catalog.decision_source,
        "version": SEED_VERSION,
        "scope": scope,
        "node_count": len(corpus.nodes),
        "edge_count": len(corpus.edges),
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
