"""Deterministic normalization of the seven compared values.

Numbers are parsed and compared here, never by a model: container counts
from expressions such as ``6 x 40'HC`` and gross weights in kilograms from
``131,058 KG``. Text is reduced to a comparison key; a model is consulted
only when two keys differ.
"""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal

from app.contracts import ComparedField

NORMALIZATION_VERSION = "normalization-v2"

PORT_FIELDS = frozenset(
    {ComparedField.PORT_OF_LOADING, ComparedField.PORT_OF_DISCHARGE}
)
NUMERIC_FIELDS = frozenset(
    {ComparedField.CONTAINER_COUNT, ComparedField.GROSS_WEIGHT_KG}
)

# Whole values, compared with punctuation and symbols removed.
_PLACEHOLDER_WORDS = frozenset(
    {
        "na",
        "n a",
        "tba",
        "tbc",
        "tbd",
        "nil",
        "none",
        "as per attached",
        "to be advised",
        "to be confirmed",
    }
)
# A blank to fill in, possibly followed by its unit: "____" or "____MT".
_UNDERSCORE_BLANK = re.compile(r"_+\s*[a-z]*", re.IGNORECASE)
# A trailing UN/LOCODE: two-letter country plus three alphanumerics.
_LOCODE_SUFFIX = re.compile(r"\s*\(([a-z]{2}[a-z0-9]{3})\)$")
_CONTAINER_GROUP = re.compile(
    r"(\d+)\s*[x×*]\s*\d{2}\s*['’ʼ]?\s*[a-z]{2,4}\b", re.IGNORECASE
)
_WEIGHT = re.compile(
    r"(?P<number>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*"
    r"(?P<unit>kgs?|kilograms?|mts?|tonnes?)?\.?",
    re.IGNORECASE,
)
_TONNES = frozenset({"mt", "mts", "tonne", "tonnes"})


class UnusableValue(ValueError):
    """A present value that cannot be compared, such as a non-number."""


def is_placeholder(raw: str | None) -> bool:
    if raw is None:
        return True
    text = " ".join(unicodedata.normalize("NFKC", raw).split())
    if _UNDERSCORE_BLANK.fullmatch(text):
        return True
    # Only letters and digits count, so "N.A.", "TBA." and "***" are placeholders.
    words = " ".join(re.sub(r"[\W_]+", " ", text).split()).casefold()
    return not words or words in _PLACEHOLDER_WORDS


def text_key(field: ComparedField, raw: str) -> str:
    text = unicodedata.normalize("NFKC", raw).casefold().strip()
    if field in PORT_FIELDS:
        text = _LOCODE_SUFFIX.sub("", text)
    return " ".join(re.sub(r"[^\w\s]", " ", text).split())


def locode(field: ComparedField, raw: str) -> str | None:
    """A port value's trailing UN/LOCODE, upper-cased, or None."""
    if field not in PORT_FIELDS:
        return None
    text = unicodedata.normalize("NFKC", raw).casefold().strip()
    match = _LOCODE_SUFFIX.search(text)
    return match[1].upper() if match else None


def container_count(raw: str) -> int:
    text = unicodedata.normalize("NFKC", raw).strip()
    groups = _CONTAINER_GROUP.findall(text)
    if groups:
        return sum(int(count) for count in groups)
    if text.isdigit():
        return int(text)
    raise UnusableValue(f"'{raw}' is not a container count")


def gross_weight_kg(raw: str) -> int | float:
    text = " ".join(unicodedata.normalize("NFKC", raw).split())
    match = _WEIGHT.fullmatch(text)
    if match is None:
        raise UnusableValue(f"'{raw}' is not a weight in kilograms or tonnes")
    number = Decimal(match["number"].replace(",", ""))
    unit = (match["unit"] or "kg").casefold()
    kilograms = number * 1000 if unit in _TONNES else number
    if kilograms == kilograms.to_integral_value():
        return int(kilograms)
    return float(kilograms)


def normalize(field: ComparedField, raw: str) -> str | int | float:
    if field is ComparedField.CONTAINER_COUNT:
        return container_count(raw)
    if field is ComparedField.GROSS_WEIGHT_KG:
        return gross_weight_kg(raw)
    return text_key(field, raw)
