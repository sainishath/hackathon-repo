import pytest
from procurement.models import AssistantResponse, RuleDecision, StepItem, ChecklistItem
from procurement.generation.validator import (
    validate_citations,
    downgrade_response_to_escalation,
)


def test_validator_accepts_valid_citations():
    decision = RuleDecision(
        status="DECIDED",
        matched_rule_id="FIXTURE:RULE-101",
        method="Direct Purchase",
        citations=["FIXTURE-POLICY:1.1"],
    )
    allowed = {"FIXTURE-POLICY:1.1", "FIXTURE-POLICY:1.2"}

    response = AssistantResponse(
        decision=decision,
        summary="Authorized direct purchase.",
        steps=[
            StepItem(
                n=1,
                action="Verify budget sanction.",
                clause_ids=["FIXTURE-POLICY:1.1"],
            )
        ],
        checklist=[
            ChecklistItem(
                item="Sanction Order",
                form_id="sanction_order.md",
                mandatory=True,
                clause_ids=["FIXTURE-POLICY:1.1"],
            )
        ],
    )

    is_valid, errors = validate_citations(response, allowed)
    assert is_valid is True
    assert len(errors) == 0


def test_validator_rejects_fake_citation_in_step():
    decision = RuleDecision(
        status="DECIDED",
        matched_rule_id="FIXTURE:RULE-101",
        citations=["FIXTURE-POLICY:1.1"],
    )
    allowed = {"FIXTURE-POLICY:1.1"}

    response = AssistantResponse(
        decision=decision,
        summary="Authorized direct purchase.",
        steps=[
            StepItem(
                n=1,
                action="Action with fake citation.",
                clause_ids=["HALLUCINATED-CLAUSE:9.9"],
            )
        ],
    )

    is_valid, errors = validate_citations(response, allowed)
    assert is_valid is False
    assert any("HALLUCINATED-CLAUSE:9.9" in e for e in errors)


def test_validator_rejects_fake_citation_in_checklist():
    decision = RuleDecision(
        status="DECIDED",
        matched_rule_id="FIXTURE:RULE-101",
        citations=["FIXTURE-POLICY:1.1"],
    )
    allowed = {"FIXTURE-POLICY:1.1"}

    response = AssistantResponse(
        decision=decision,
        summary="Authorized direct purchase.",
        checklist=[
            ChecklistItem(
                item="Fake Requirement",
                mandatory=True,
                clause_ids=["UNAUTHORIZED:404"],
            )
        ],
    )

    is_valid, errors = validate_citations(response, allowed)
    assert is_valid is False
    assert any("UNAUTHORIZED:404" in e for e in errors)


def test_downgrade_response_to_escalation():
    decision = RuleDecision(
        status="DECIDED",
        matched_rule_id="FIXTURE:RULE-101",
        citations=["FIXTURE-POLICY:1.1"],
    )
    response = AssistantResponse(
        decision=decision,
        summary="Authorized direct purchase.",
        steps=[
            StepItem(
                n=1,
                action="Some action.",
                clause_ids=["FAKE:1"],
            )
        ],
    )

    downgraded = downgrade_response_to_escalation(
        response, ["Step 1 cites unauthorized clause 'FAKE:1'"]
    )
    assert downgraded.decision.status == "ESCALATE"
    assert any("Citation validation failure" in r for r in downgraded.decision.escalation_reasons)
    assert len(downgraded.steps) == 0
