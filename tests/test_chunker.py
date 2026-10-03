import pytest
from procurement.ingest.chunker import chunk_text, normalize_clause_id, process_document
from procurement.config import settings


def test_normalize_clause_id():
    assert normalize_clause_id("DOC-1", "Rule 145") == "DOC-1:145"
    assert normalize_clause_id("DOC-2", "4.2.1") == "DOC-2:4.2.1"
    assert normalize_clause_id("DOC-3", "Clause 3.1") == "DOC-3:3.1"


def test_chunk_text_multiple_numbered_headings():
    sample_text = """
Rule 1.1 Direct Purchase of Goods
Procurement of goods up to INR 25,000 may be made directly without quotation.

Rule 1.2 Local Purchase Committee
Goods from INR 25,001 to 250,000 shall be purchased by a three-member LPC.

4.2.1 Proprietary Article Certificate
Sole source items require PAC from the manufacturer.
    """.strip()

    meta = {
        "doc_id": "TEST-POLICY",
        "doc_title": "Test Procurement Guidelines",
        "doc_type": "policy",
        "version": "v1.0",
        "effective_date": "2024-01-01",
        "is_current": True,
        "superseded_by": None,
    }

    clauses = chunk_text(sample_text, meta=meta, page=3)
    assert len(clauses) == 3

    c1 = clauses[0]
    assert c1.clause_id == "TEST-POLICY:1.1"
    assert "Direct Purchase of Goods" in c1.section_path
    assert "up to INR 25,000" in c1.text
    assert c1.page == 3
    assert c1.is_current is True

    c2 = clauses[1]
    assert c2.clause_id == "TEST-POLICY:1.2"
    assert "25,001 to 250,000" in c2.text

    c3 = clauses[2]
    assert c3.clause_id == "TEST-POLICY:4.2.1"
    assert "Proprietary Article Certificate" in c3.section_path


def test_chunk_text_fallback_no_headings():
    sample_text = "General preamble text with no numbered rules."
    meta = {"doc_id": "TEST-DOC"}
    clauses = chunk_text(sample_text, meta=meta, page=1)
    assert len(clauses) == 1
    assert clauses[0].clause_id == "TEST-DOC:P1"
    assert clauses[0].text == sample_text


def test_process_fixture_pdf():
    fixture_pdf = settings.fixtures_dir / "sample_policy.pdf"
    if fixture_pdf.exists():
        clauses = process_document(fixture_pdf)
        assert len(clauses) >= 1
        assert "Rule 1.1" in clauses[0].text or "Direct Purchase" in clauses[0].text
