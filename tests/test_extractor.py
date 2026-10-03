import pytest
from procurement.generation.extractor import parse_inr_text, extract_regex_fallback, extract_requisition_input
from procurement.models import CaseInput
from fastapi.testclient import TestClient
from procurement.api import app


def test_parse_inr_text():
    assert parse_inr_text("Purchase for 4.8 lakhs") == 480000.0
    assert parse_inr_text("Lab budget 1.5 crore") == 15000000.0
    assert parse_inr_text("Repair costing 50k") == 50000.0
    assert parse_inr_text("Total value ₹ 25,000") == 25000.0
    assert parse_inr_text("Procure workstations with no price") is None


def test_extract_requisition_input_sole_source_amount():
    text = "Need 3 lab workstations for 4.8 lakhs from single vendor in AI Lab"
    case = extract_requisition_input(text)
    assert case.estimated_value_inr == 480000.0
    assert case.is_sole_source is True
    assert case.category == "goods"
    assert case.department is not None


def test_extract_requisition_input_missing_amount_yields_none():
    text = "Need specialized consultancy advisory for university curriculum update"
    case = extract_requisition_input(text)
    assert case.estimated_value_inr is None
    assert case.category == "Consultancy"


def test_api_evaluate_with_text():
    client = TestClient(app)
    payload = {"text": "Need 3 lab workstations for 4.8 lakhs from single vendor"}
    resp = client.post("/api/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"]["status"] == "DECIDED"
    assert data["decision"]["matched_rule_id"] == "RULE_SOLE_SOURCE"
    assert data["extracted_input"]["estimated_value_inr"] == 480000.0
    assert data["extracted_input"]["is_sole_source"] is True
    assert "compliance_memo" in data
    assert "Statutory Procurement Compliance Memo" in data["compliance_memo"]
