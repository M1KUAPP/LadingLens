"""Admit a valid SI/draft-BL pair and compare its seven fields.

The SI is the reference. Structural failures are decided before any field
verdict with the shared precedence (unreadable, wrong_doc_type,
missing_attachment, missing_value). Numbers are compared here; differing
text is judged by pinned Jev and mapped through the locked bands.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from app.contracts import (
    Category,
    ComparedField,
    EvaluatorOutput,
    ExtractedValue,
    FieldVerdict,
    ReviewReason,
    Status,
)
from app.extraction import DocumentAnalysis, ExtractionFailure
from app.formats import PARSER_VERSION
from app.jev import (
    DocumentRole,
    EquivalenceQuestion,
    JevEquivalence,
    JevProviderFailure,
)
from app.normalization import (
    NUMERIC_FIELDS,
    UnusableValue,
    is_placeholder,
    locode,
    normalize,
    text_key,
)
from app.submission import StructuralDiagnostic, select_structural_review_reason

MATCH_THRESHOLD = 0.85
MISMATCH_THRESHOLD = 0.30

FIELD_LABELS: dict[ComparedField, str] = {
    ComparedField.SHIPPER: "Shipper",
    ComparedField.CONSIGNEE: "Consignee",
    ComparedField.NOTIFY_PARTY: "Notify party",
    ComparedField.PORT_OF_LOADING: "Port of loading",
    ComparedField.PORT_OF_DISCHARGE: "Port of discharge",
    ComparedField.CONTAINER_COUNT: "Container count",
    ComparedField.GROSS_WEIGHT_KG: "Gross weight",
}
_ROLE_LABELS = {"SI": "Shipping Instruction", "DRAFT_BL": "draft Bill of Lading"}

Band = Literal["MATCH", "REVIEW", "MISMATCH"]


def band(probability: float) -> Band:
    if probability >= MATCH_THRESHOLD:
        return "MATCH"
    if probability <= MISMATCH_THRESHOLD:
        return "MISMATCH"
    return "REVIEW"


@dataclass(frozen=True, slots=True)
class PairAdmission:
    si: DocumentAnalysis | None = None
    draft_bl: DocumentAnalysis | None = None
    diagnostics: tuple[StructuralDiagnostic, ...] = ()
    blocking_failure: ExtractionFailure | JevProviderFailure | None = None

    @property
    def admitted(self) -> bool:
        return (
            self.si is not None
            and self.draft_bl is not None
            and not self.diagnostics
            and self.blocking_failure is None
        )


def _diagnostic(
    reason: ReviewReason,
    detail: str,
    analysis: DocumentAnalysis | None = None,
    *,
    role: Literal["SI", "DRAFT_BL", "OTHER"] | None = None,
) -> StructuralDiagnostic:
    return StructuralDiagnostic(
        reason=reason,
        detail=detail,
        attachment_id=analysis.attachment_id if analysis else None,
        document_role=role,
        source_hash=analysis.preflight.content_hash if analysis else None,
        parser_route=analysis.route if analysis else None,
        parser_version=PARSER_VERSION if analysis else None,
        provider_request_id=(
            analysis.role.provider_request_id if analysis and analysis.role else None
        ),
    )


def admit_pair(analyses: Sequence[DocumentAnalysis]) -> PairAdmission:
    diagnostics: list[StructuralDiagnostic] = []
    for analysis in analyses:
        if analysis.unreadable is not None:
            diagnostics.append(
                _diagnostic(
                    ReviewReason.UNREADABLE,
                    analysis.unreadable.root.parse_error,
                    analysis,
                )
            )
        elif analysis.preflight.status == "UNSUPPORTED":
            diagnostics.append(
                _diagnostic(
                    ReviewReason.WRONG_DOC_TYPE,
                    analysis.preflight.diagnostic or "The file type is not supported",
                    analysis,
                )
            )
    has_unreadable = any(d.reason == ReviewReason.UNREADABLE for d in diagnostics)
    failure = next(
        (analysis.failure for analysis in analyses if analysis.failure is not None),
        None,
    )
    if failure is not None:
        # An unreadable file already outranks anything a document whose
        # provider call failed could add. An unsupported one does not: the
        # failed document could still complete a pair that ignores it.
        if has_unreadable:
            return PairAdmission(diagnostics=tuple(diagnostics))
        return PairAdmission(blocking_failure=failure)

    by_role: dict[DocumentRole, list[DocumentAnalysis]] = {
        role: [] for role in DocumentRole
    }
    for analysis in analyses:
        if analysis.role is not None:
            by_role[analysis.role.role].append(analysis)
    si_docs, bl_docs = by_role[DocumentRole.SI], by_role[DocumentRole.DRAFT_BL]
    # Beside a valid pair, an unsupported file is ignored like an OTHER
    # document; an unreadable one could be the real SI or draft BL.
    if not has_unreadable and len(si_docs) == 1 and len(bl_docs) == 1:
        return _check_values(si_docs[0], bl_docs[0])

    for other in by_role[DocumentRole.OTHER]:
        diagnostics.append(
            _diagnostic(
                ReviewReason.WRONG_DOC_TYPE,
                "This attachment is not a Shipping Instruction or draft Bill of Lading",
                other,
                role="OTHER",
            )
        )
    for role, documents in (("SI", si_docs), ("DRAFT_BL", bl_docs)):
        for extra in documents[1:]:
            diagnostics.append(
                _diagnostic(
                    ReviewReason.WRONG_DOC_TYPE,
                    f"More than one {_ROLE_LABELS[role]} was attached",
                    extra,
                    role=role,
                )
            )
        if not documents:
            detail = (
                f"No readable {_ROLE_LABELS[role]} was attached"
                if has_unreadable
                else f"No {_ROLE_LABELS[role]} was attached"
            )
            diagnostics.append(
                _diagnostic(
                    ReviewReason.MISSING_ATTACHMENT,
                    detail,
                    role=role,
                )
            )
    return PairAdmission(diagnostics=tuple(diagnostics))


def _values(analysis: DocumentAnalysis) -> dict[ComparedField, ExtractedValue]:
    if analysis.extraction is None:
        raise ValueError("an admitted document must carry its extracted values")
    return {value.field: value for value in analysis.extraction.values}


def _check_values(si: DocumentAnalysis, draft_bl: DocumentAnalysis) -> PairAdmission:
    diagnostics: list[StructuralDiagnostic] = []
    for role, analysis in (("SI", si), ("DRAFT_BL", draft_bl)):
        values = _values(analysis)
        for field in ComparedField:
            label = f"{FIELD_LABELS[field]} in the {_ROLE_LABELS[role]}"
            value = values.get(field)
            detail: str | None = None
            if value is None:
                detail = f"{label} is absent"
            elif is_placeholder(value.raw_value):
                shown = (value.raw_value or "").strip()
                detail = (
                    f"{label} is a placeholder ('{shown}')"
                    if shown
                    else f"{label} is blank"
                )
            elif field in NUMERIC_FIELDS:
                try:
                    normalize(field, value.raw_value or "")
                except UnusableValue as error:
                    detail = f"{label} is not usable: {error}"
            if detail is not None:
                diagnostics.append(
                    _diagnostic(ReviewReason.MISSING_VALUE, detail, analysis, role=role)
                )
    return PairAdmission(si=si, draft_bl=draft_bl, diagnostics=tuple(diagnostics))


@dataclass(frozen=True, slots=True)
class FieldDraft:
    field: ComparedField
    si: ExtractedValue
    draft_bl: ExtractedValue
    deterministic_result: Literal["MATCH", "MISMATCH"] | None


def compare_fields(admission: PairAdmission) -> tuple[FieldDraft, ...]:
    if not admission.admitted:
        raise ValueError("only an admitted SI/draft-BL pair can be compared")
    si_values, bl_values = _values(admission.si), _values(admission.draft_bl)
    drafts: list[FieldDraft] = []
    for field in ComparedField:
        si_value, bl_value = si_values[field], bl_values[field]
        si_raw, bl_raw = si_value.raw_value or "", bl_value.raw_value or ""
        si_code, bl_code = locode(field, si_raw), locode(field, bl_raw)
        if si_code and bl_code and si_code != bl_code:
            # A different port, or a country in capitals beside a code: the
            # keys keep both tokens, so Jev reads the original texts.
            si_key = text_key(field, si_raw, keep_locode=True)
            bl_key = text_key(field, bl_raw, keep_locode=True)
        else:
            si_key, bl_key = normalize(field, si_raw), normalize(field, bl_raw)
        same = si_key == bl_key
        drafts.append(
            FieldDraft(
                field=field,
                si=si_value.model_copy(update={"normalized_value": si_key}),
                draft_bl=bl_value.model_copy(update={"normalized_value": bl_key}),
                deterministic_result=(
                    ("MATCH" if same else "MISMATCH")
                    if field in NUMERIC_FIELDS or same
                    else None
                ),
            )
        )
    return tuple(drafts)


def equivalence_questions(drafts: Sequence[FieldDraft]) -> list[EquivalenceQuestion]:
    return [
        EquivalenceQuestion(
            field=draft.field,
            si_value=draft.si.raw_value or "",
            draft_bl_value=draft.draft_bl.raw_value or "",
        )
        for draft in drafts
        if draft.deterministic_result is None
    ]


def _shown(value: ExtractedValue) -> str:
    normalized = value.normalized_value
    if isinstance(normalized, (int, float)) and not isinstance(normalized, bool):
        return f"{normalized:,}"
    return value.raw_value or ""


def _deterministic_reason(draft: FieldDraft) -> str:
    label = FIELD_LABELS[draft.field]
    if draft.deterministic_result == "MATCH":
        if draft.field in NUMERIC_FIELDS:
            return f"{label} is {_shown(draft.si)} in both documents"
        return f"{label} is the same after normalization"
    return (
        f"{label} differs: {_shown(draft.si)} in the Shipping Instruction, "
        f"{_shown(draft.draft_bl)} in the draft Bill of Lading"
    )


def _semantic_reason(draft: FieldDraft, probability: float, state: Band) -> str:
    label = FIELD_LABELS[draft.field]
    if state == "MATCH":
        return f"{label} judged the same (match probability {probability:.2f})"
    if state == "MISMATCH":
        return f"{label} judged different (match probability {probability:.2f})"
    return (
        f"{label} needs a reviewer: match probability {probability:.2f} is between "
        f"{MISMATCH_THRESHOLD:.2f} and {MATCH_THRESHOLD:.2f}"
    )


def resolve_verdicts(
    drafts: Sequence[FieldDraft], equivalences: Sequence[JevEquivalence]
) -> tuple[FieldVerdict, ...]:
    probabilities = {item.field: item.probability for item in equivalences}
    verdicts: list[FieldVerdict] = []
    for draft in drafts:
        if draft.deterministic_result is not None:
            verdicts.append(
                FieldVerdict(
                    field=draft.field,
                    si=draft.si,
                    draft_bl=draft.draft_bl,
                    deterministic_result=draft.deterministic_result,
                    semantic_probability=None,
                    interactive_state=draft.deterministic_result,
                    batch_result=draft.deterministic_result,
                    reason=_deterministic_reason(draft),
                )
            )
            continue
        if draft.field not in probabilities:
            raise ValueError(f"no equivalence answer for {draft.field.value}")
        probability = probabilities[draft.field]
        state = band(probability)
        verdicts.append(
            FieldVerdict(
                field=draft.field,
                si=draft.si,
                draft_bl=draft.draft_bl,
                deterministic_result="NOT_APPLICABLE",
                semantic_probability=probability,
                interactive_state=state,
                batch_result="MATCH" if state == "MATCH" else "MISMATCH",
                reason=_semantic_reason(draft, probability, state),
            )
        )
    return tuple(verdicts)


def structural_output(diagnostics: Sequence[StructuralDiagnostic]) -> EvaluatorOutput:
    reason = select_structural_review_reason(diagnostics)
    if reason is None:
        raise ValueError("a structural outcome requires at least one diagnostic")
    return EvaluatorOutput(
        category=Category.BL_COMPARISON,
        status=Status.NEEDS_REVIEW,
        review_reason=reason,
        defect_fields=[],
        has_defect=False,
    )


def comparison_output(verdicts: Sequence[FieldVerdict]) -> EvaluatorOutput:
    if [verdict.field for verdict in verdicts] != list(ComparedField):
        raise ValueError("a comparison outcome needs all seven fields in order")
    defects = [
        verdict.field for verdict in verdicts if verdict.batch_result == "MISMATCH"
    ]
    return EvaluatorOutput(
        category=Category.BL_COMPARISON,
        status=Status.MISMATCH if defects else Status.OK,
        review_reason=None,
        defect_fields=defects,
        has_defect=bool(defects),
    )


def needs_interactive_review(verdicts: Sequence[FieldVerdict]) -> bool:
    return any(verdict.interactive_state == "REVIEW" for verdict in verdicts)
