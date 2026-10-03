from typing import Union
from procurement.models import AssistantResponse, RuleDecision


class CitationValidationError(Exception):
    """Raised when generated response contains unauthorized or hallucinated clause citations."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_citations(
    response: AssistantResponse,
    allowed_clause_ids: set[str],
) -> tuple[bool, list[str]]:
    """Validate that every step and checklist item cites only allowed clause_ids.
    
    Allowed clause IDs are strictly the union of retrieved clause IDs and
    the rules engine decision citations.
    """
    errors: list[str] = []

    # 1. Validate steps
    for step in response.steps:
        for cid in step.clause_ids:
            if cid not in allowed_clause_ids:
                errors.append(
                    f"Step {step.n} cites unauthorized or unverified clause_id '{cid}'."
                )

    # 2. Validate checklist items
    for item in response.checklist:
        for cid in item.clause_ids:
            if cid not in allowed_clause_ids:
                errors.append(
                    f"Checklist item '{item.item}' cites unauthorized clause_id '{cid}'."
                )

    is_valid = len(errors) == 0
    return is_valid, errors


def downgrade_response_to_escalation(
    response: AssistantResponse,
    validation_errors: list[str],
) -> AssistantResponse:
    """Downgrade an AssistantResponse to ESCALATE when citation verification fails."""
    escalation_note = (
        "AUTOMATIC ESCALATION: Citation validation failure. The response attempted to cite "
        f"unverified clauses: {'; '.join(validation_errors)}"
    )

    # Preserve engine decision but escalate status
    downgraded_decision = response.decision.model_copy()
    downgraded_decision.status = "ESCALATE"
    if escalation_note not in downgraded_decision.escalation_reasons:
        downgraded_decision.escalation_reasons.append(escalation_note)

    # Filter out steps and checklist items that cite invalid clauses or clear them
    filtered_escalations = list(response.escalations)
    if escalation_note not in filtered_escalations:
        filtered_escalations.append(escalation_note)

    return AssistantResponse(
        decision=downgraded_decision,
        summary=f"Procurement escalated due to citation verification failure. Manual audit required.",
        steps=[],
        checklist=[],
        missing_info=response.missing_info,
        escalations=filtered_escalations,
    )
