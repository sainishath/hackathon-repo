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
    assert decision.matched_rule_id == "RULE_DIRECT_PURCHASE"
    assert decision.method == "Direct Purchase without Quotation"
    assert decision.approver == "Head of Department (HoD)"


def test_boundary_direct_purchase_exact_upper(engine):
    # Rule Direct Purchase: 0 <= value <= 50,000 (inclusive_max: True)
    case = CaseInput(
        category="goods",
        estimated_value_inr=50000.0,
        item_description="Specialized lab printer and toner",
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_DIRECT_PURCHASE"
    assert decision.method == "Direct Purchase without Quotation"
    assert decision.approver == "Head of Department (HoD)"
    assert decision.committee_required is False
    assert decision.min_quotations == 0


def test_boundary_lpc_just_above_direct(engine):
    # Rule LPC: 50,000 < value <= 500,000 (inclusive_min: False)
    case = CaseInput(
        category="goods",
        estimated_value_inr=50000.01,
        item_description="Lab measurement tools",
        quotations_received=3,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_PURCHASE_COMMITTEE"
    assert decision.method == "Purchase by Local Purchase Committee"
    assert decision.approver == "Dean (R&D / Academic)"
    assert decision.committee_required is True
    assert decision.min_quotations == 3


def test_boundary_lpc_exact_upper(engine):
    # Exactly 500,000 should fall into LPC
    case = CaseInput(
        category="goods",
        estimated_value_inr=500000.0,
        item_description="Department servers",
        quotations_received=3,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_PURCHASE_COMMITTEE"
    assert decision.approver == "Dean (R&D / Academic)"


def test_boundary_lte_just_above_lpc(engine):
    # Rule LTE: 500,000 < value <= 2,500,000 (inclusive_min: False)
    case = CaseInput(
        category="goods",
        estimated_value_inr=500000.01,
        item_description="Workstations",
        quotations_received=3,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_LIMITED_TENDER"
    assert decision.method == "Limited Tender Enquiry (LTE)"
    assert decision.approver == "Director"


def test_boundary_lte_exact_upper(engine):
    # Exactly 2,500,000 should fall into LTE
    case = CaseInput(
        category="goods",
        estimated_value_inr=2500000.0,
        item_description="Research equipment",
        quotations_received=3,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_LIMITED_TENDER"
    assert decision.approver == "Director"


def test_boundary_open_tender_above_lte(engine):
    # Rule Open Tender: value > 2,500,000
    case = CaseInput(
        category="goods",
        estimated_value_inr=2500000.01,
        item_description="Supercomputer GPU cluster",
        quotations_received=3,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_OPEN_TENDER"
    assert decision.method == "Advertised Tender Enquiry (ATE / CPPP / GeM)"
    assert decision.approver == "Director / Board of Governors"


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


def test_emergency_exception_handled(engine):
    # Emergency <= 50,000 matches RULE_EMERGENCY
    case = CaseInput(
        category="goods",
        estimated_value_inr=40000.0,
        item_description="Emergency HVAC compressor repair",
        is_emergency=True,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_EMERGENCY"
    assert decision.approver == "Head of Department (Report to Director within 48h)"
    assert "INST-2026-DP4" in decision.citations


def test_emergency_exception_above_threshold_escalates(engine):
    # Emergency > 50,000 exceeds HoD emergency powers and must escalate
    case = CaseInput(
        category="goods",
        estimated_value_inr=150000.0,
        item_description="Major transformer explosion emergency replacement",
        is_emergency=True,
    )
    decision = engine.evaluate(case)
    assert decision.status == "ESCALATE"
    assert any("Emergency" in r for r in decision.escalation_reasons)


def test_sole_source_exception(engine):
    case = CaseInput(
        category="goods",
        estimated_value_inr=400000.0,
        item_description="Proprietary spectrometer probe from OEM",
        is_sole_source=True,
        quotations_received=1,
    )
    decision = engine.evaluate(case)
    assert decision.status == "DECIDED"
    assert decision.matched_rule_id == "RULE_SOLE_SOURCE"
    assert decision.approver == "Director"
    assert "GFR-2017-R166" in decision.citations


def test_escalate_insufficient_quotations(engine):
    # LPC requires 3 quotations; only 1 provided => ESCALATE
    case = CaseInput(
        category="goods",
        estimated_value_inr=120000.0,
        item_description="Lab hardware",
        quotations_received=1,
    )
    decision = engine.evaluate(case)
    assert decision.status == "ESCALATE"
    assert any("Insufficient quotations" in r for r in decision.escalation_reasons)


def test_escalate_unmapped_category(engine):
    case = CaseInput(
        category="Consultancy",
        estimated_value_inr=200000.0,
        item_description="Curriculum audit consulting",
    )
    decision = engine.evaluate(case)
    assert decision.status == "ESCALATE"
    assert any("No matching procurement rule" in r for r in decision.escalation_reasons)
