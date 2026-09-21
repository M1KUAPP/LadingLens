import pytest

from app.contracts import ComparedField
from app.normalization import (
    UnusableValue,
    container_count,
    gross_weight_kg,
    is_placeholder,
    locode,
    normalize,
    text_key,
)


@pytest.mark.parametrize(
    "raw",
    [
        None,
        "",
        "   ",
        "N/A",
        "n/a",
        "NA",
        "TBA",
        "tbc",
        "TBD",
        "NIL",
        "None",
        "AS PER ATTACHED",
        "To be advised",
        "-",
        "---",
        "_______",
        "____MT",
        "_______ MTS",
        # Punctuation and symbols do not make a value.
        "N.A.",
        "N/A.",
        "TBA.",
        ".",
        "***",
    ],
)
def test_placeholders_are_missing_values(raw):
    assert is_placeholder(raw) is True


@pytest.mark.parametrize(
    "raw",
    ["APRIL FAR EAST (M) SDN BHD", "0", "6 x 40'HC", "NANTONG", "NANTONG, CHINA"],
)
def test_real_values_are_not_placeholders(raw):
    assert is_placeholder(raw) is False


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("6 x 40'HC", 6),
        ("12 x 40'HC", 12),
        ("1 x 20'GP", 1),
        ("10 x 20'FCL", 10),
        ("6 X 20' GP", 6),
        ("1 x 40'HC + 2 x 20'GP", 3),
        ("7", 7),
        ("6 x 40’HC", 6),
        ("6 x 40ʼHC", 6),
        # Type letters are optional in every group, as is the apostrophe.
        ("1 X 40HC + 2 X 20'", 3),
        ("2 x 20GP + 1 x 40'", 3),
        ("6x40'", 6),
    ],
)
def test_container_count_reads_the_number_of_containers(raw, expected):
    assert container_count(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "six containers",
        "40'HC",
        "x 20'GP",
        # A group that cannot be read fails the whole value, never a partial sum.
        "1 x 40'HC + 2 x 400'",
        "1 x 40'HC + TWO x 20'GP",
        "2 x 20GP + 1 x",
    ],
)
def test_container_count_rejects_non_counts(raw):
    with pytest.raises(UnusableValue):
        container_count(raw)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("131,058 KG", 131058),
        ("21,577 KG", 21577),
        ("341715", 341715),
        ("21,745", 21745),
        ("40,326 kgs", 40326),
        ("1,234.5 KG", 1234.5),
        ("134.586 MT", 134586),
        ("23,702 KG.", 23702),
        ("131,058.00", 131058),
        ("131.5", 131.5),
        # Tonnes are written to the kilogram with three decimals.
        ("12.500 MT", 12500),
        # Dot thousands with a decimal comma.
        ("131.058,00 KG", 131058),
        ("1.234.567,89 KG", 1234567.89),
    ],
)
def test_gross_weight_is_kilograms(raw, expected):
    assert gross_weight_kg(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "21,57 KG",
        "ABOUT 20 TONS",
        "12 LBS",
        # A lone dot before three digits could be thousands or a decimal.
        "131.058 KG",
        "12.500",
    ],
)
def test_gross_weight_rejects_unknown_shapes(raw):
    with pytest.raises(UnusableValue):
        gross_weight_kg(raw)


def test_text_key_ignores_case_spacing_and_punctuation():
    assert text_key(
        ComparedField.SHIPPER, "KPP-ANTALIS (SINGAPORE) PTE. LTD."
    ) == text_key(ComparedField.SHIPPER, "kpp antalis  (singapore) pte ltd")


def test_port_key_drops_a_trailing_locode_but_keeps_the_city():
    assert text_key(
        ComparedField.PORT_OF_LOADING, "NHAVA SHEVA, INDIA (INNSA)"
    ) == text_key(ComparedField.PORT_OF_LOADING, "NHAVA SHEVA, INDIA")
    # The dataset keeps the SI's code when it changes the city: the code proves nothing.
    assert text_key(
        ComparedField.PORT_OF_DISCHARGE, "MOMBASA, KENYA (KEMBA)"
    ) != text_key(ComparedField.PORT_OF_DISCHARGE, "TUTICORIN, INDIA (KEMBA)")
    # A parenthesised name that is not a 5-character code stays.
    assert "westport" in text_key(
        ComparedField.PORT_OF_LOADING, "PORT KLANG (WESTPORT), MALAYSIA"
    )


def test_port_key_keeps_a_bracketed_country_that_is_not_a_code():
    assert (
        text_key(ComparedField.PORT_OF_LOADING, "Shanghai (China)") == "shanghai china"
    )


def test_party_key_keeps_the_locode_pattern():
    assert "innsa" in text_key(ComparedField.SHIPPER, "ACME (INNSA)")


def test_locode_reads_only_a_port_values_trailing_code():
    assert locode(ComparedField.PORT_OF_LOADING, "Portland (USPDX)") == "USPDX"
    # Read case-sensitively: a bracketed country is not a code.
    assert locode(ComparedField.PORT_OF_LOADING, "Shanghai (China)") is None
    assert (
        locode(ComparedField.PORT_OF_LOADING, "PORT KLANG (WESTPORT), MALAYSIA") is None
    )
    assert locode(ComparedField.SHIPPER, "ACME (INNSA)") is None


def test_normalize_dispatches_by_field():
    assert normalize(ComparedField.CONTAINER_COUNT, "6 x 40'HC") == 6
    assert normalize(ComparedField.GROSS_WEIGHT_KG, "131,058 KG") == 131058
    assert (
        normalize(ComparedField.CONSIGNEE, "Moorim SP Co., Ltd") == "moorim sp co ltd"
    )
