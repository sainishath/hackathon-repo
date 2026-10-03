import pytest
from procurement.models import CaseInput
from procurement.rules.engine import RulesEngine


@pytest.fixture
def engine():
    return RulesEngine()


def test_boundary_zero(engine):
    case = CaseInput(
        category="goods",
        estimated_value_inr=0.0,
        item_description="Sample zero cost goods",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-101"
    assert decision.method == "Direct Purchase without Quotation"


def test_boundary_direct_purchase_exact_upper(engine):
    # Rule 101: 0 <= value <= 25,000 (max_inclusive: True)
    case = CaseInput(
        category="goods",
        estimated_value_inr=25000.0,
        item_description="Office supplies",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-101"
    assert decision.method == "Direct Purchase without Quotation"


def test_boundary_lpc_just_above_direct(engine):
    # Rule 102: 25,000 < value <= 250,000 (min_inclusive: False)
    case = CaseInput(
        category="goods",
        estimated_value_inr=25000.01,
        item_description="Lab supplies",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-102"
    assert decision.method == "Purchase by Local Purchase Committee (LPC)"


def test_boundary_lpc_exact_upper(engine):
    # Exactly 250,000 should fall into LPC
    case = CaseInput(
        category="goods",
        estimated_value_inr=250000.0,
        item_description="Department servers",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-102"


def test_boundary_lte_just_above_lpc(engine):
    # Rule 103: 250,000 < value <= 2,500,000 (min_inclusive: False)
    case = CaseInput(
        category="goods",
        estimated_value_inr=250000.01,
        item_description="Workstations",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-103"
    assert decision.method == "Limited Tender Enquiry (LTE)"


def test_boundary_lte_exact_upper(engine):
    # Exactly 2,500,000 should fall into LTE
    case = CaseInput(
        category="goods",
        estimated_value_inr=2500000.0,
        item_description="Research equipment",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-103"


def test_boundary_open_tender_above_lte(engine):
    # Rule 104: value > 2,500,000
    case = CaseInput(
        category="goods",
        estimated_value_inr=2500000.01,
        item_description="Supercomputer",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "FIXTURE:RULE-104"
    assert decision.method == "Advertised Open Tender"


def test_needs_info_missing_fields(engine):
    # Missing estimated_value_inr
    case_no_val = CaseInput(
        category="goods",
        estimated_value_inr=None,
        item_description="Paper",
    )
    dec1 = engine.evaluate(case_no_val)
    assert dec1.status == "NEEDS_INFO"
    assert "estimated_value_inr" in dec1.missing_fields

    # Missing category
    case_no_cat = CaseInput(
        category=None,
        estimated_value_inr=10000.0,
        item_description="Paper",
    )
    dec2 = engine.evaluate(case_no_cat)
    assert dec2.status == "NEEDS_INFO"
    assert "category" in dec2.missing_fields

    # Missing item_description
    case_no_desc = CaseInput(
        category="goods",
        estimated_value_inr=10000.0,
        item_description="",
    )
    dec3 = engine.evaluate(case_no_desc)
    assert dec3.status == "NEEDS_INFO"
    assert "item_description" in dec3.missing_fields


def test_escalate_emergency_exception(engine):
    case = CaseInput(
        category="goods",
        estimated_value_inr=10000.0,
        item_description="Emergency medicine kits",
        is_emergency=True,
    )
    decision = engine.evaluate(case)
    assert decision.status == "ESCALATE"
    assert any("Emergency" in r for r in decision.escalation_reasons)


def test_escalate_sole_source_exception(engine):
    case = CaseInput(
        category="goods",
        estimated_value_inr=10000.0,
        item_description="Proprietary spectrometer probe",
        is_sole_source=True,
    )
    decision = engine.evaluate(case)
    assert decision.status == "ESCALATE"
    assert any("Sole source" in r for r in decision.escalation_reasons)


def test_escalate_no_matching_rule(engine):
    # Category with no matching rules or invalid band
    case = CaseInput(
        category="works",
        estimated_value_inr=10000000.0,  # Works band only goes up to 500k in fixture
        item_description="Major campus building construction",
    )
    decision = engine.evaluate(case)
    assert decision.status == "ESCALATE"
    assert any("No matching procurement rule" in r for r in decision.escalation_reasons)
