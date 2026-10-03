from typing import Optional
from procurement.models import CaseInput, RuleDecision, ScoredClause, AssistantResponse
from procurement.generation.llm import BaseLLMClient, get_llm_client
from procurement.generation.prompts import build_generation_prompt
from procurement.generation.validator import (
    validate_citations,
    downgrade_response_to_escalation,
)


def generate_response(
    case: CaseInput,
    decision: RuleDecision,
    retrieved_clauses: list[ScoredClause],
    llm_client: Optional[BaseLLMClient] = None,
) -> AssistantResponse:
    """Generate and validate AssistantResponse with single-retry and escalation fallback."""
    client = llm_client or get_llm_client()

    # Allowed citations: union of engine citations and retrieved clause IDs
    allowed_citations = set(decision.citations) | {
        sc.clause.clause_id for sc in retrieved_clauses
    }

    # First generation attempt
    prompt = build_generation_prompt(case, decision, retrieved_clauses)
    raw_payload = client.generate_json(prompt, AssistantResponse)

    try:
        response = AssistantResponse.model_validate(raw_payload)
    except Exception:
        # Fallback to minimal response if parsing fails
        response = AssistantResponse(
            decision=decision,
            summary="Procurement case parsed.",
            steps=[],
            checklist=[],
        )

    # STRICT RULE: engine decision is authoritative and copied directly, never LLM-written
    response.decision = decision

    # Validate citations
    is_valid, errors = validate_citations(response, allowed_citations)
    if is_valid:
        return response

    # On failure: retry once with corrective prompt
    retry_feedback = (
        f"Validation failed: {'; '.join(errors)}. "
        f"You must strictly cite ONLY clause IDs from: {list(allowed_citations)}."
    )
    retry_prompt = build_generation_prompt(
        case, decision, retrieved_clauses, retry_feedback=retry_feedback
    )
    raw_retry = client.generate_json(retry_prompt, AssistantResponse)

    try:
        retry_response = AssistantResponse.model_validate(raw_retry)
    except Exception:
        retry_response = response

    retry_response.decision = decision
    retry_valid, retry_errors = validate_citations(retry_response, allowed_citations)
    if retry_valid:
        return retry_response

    # If retry also fails, downgrade to escalation with a note
    return downgrade_response_to_escalation(retry_response, retry_errors)
