import json
from procurement.models import CaseInput, RuleDecision, ScoredClause


SYSTEM_PROMPT = """You are an Institutional Procurement Assistant adhering to statutory procurement rules.
CORE PRINCIPLE: You NEVER decide procurement thresholds, sanctioning authorities, or procurement methods.
The Rules Engine has already determined the binding RuleDecision.
Your job is ONLY to compile a clear, cited step-by-step procedure, document checklist, and an executive compliance memo based on the decision and the retrieved clauses.

COMPLIANCE MEMO REQUIREMENTS:
Generate a structured, plain-English 'compliance_memo' with 5 clear sections:
1. Requisition Understanding: Plain-English breakdown of what is being procured, value in INR, department, and urgency.
2. Why This Rule Applies: Statutory rationale explaining why the matched rule, method, and approval tier apply.
3. Identified Issues / Edge Cases: Critical legal/operational conditions (e.g. GeM availability verification, PAC certificate requirements, statutory thresholds).
4. Step-by-Step Action Roadmap: Concrete operational roadmap including offices/portals to use.
5. Required Forms & Approvals: Summary of forms to execute and exact approving authority.

CITATION RULE:
Every step action and checklist item must cite valid clause_ids that exist in the PROVIDED CLAUSES or ENGINE CITATIONS list below.
DO NOT hallucinate or cite any clause ID that is not explicitly provided.
"""


def build_generation_prompt(
    case: CaseInput,
    decision: RuleDecision,
    retrieved_clauses: list[ScoredClause],
    retry_feedback: str = "",
) -> str:
    """Construct prompt for structured LLM response generation."""
    case_summary = {
        "item_description": case.item_description,
        "category": case.category,
        "estimated_value_inr": case.estimated_value_inr,
        "funding_source": case.funding_source,
        "department": case.department,
        "is_emergency": case.is_emergency,
        "is_sole_source": case.is_sole_source,
        "quotations_received": case.quotations_received,
    }

    clauses_text = []
    allowed_ids = set(decision.citations)
    for sc in retrieved_clauses:
        c = sc.clause
        allowed_ids.add(c.clause_id)
        clauses_text.append(
            f"[{c.clause_id}] {c.section_path} (Doc: {c.doc_title}, v{c.version})\n{c.text}"
        )

    prompt = f"""{SYSTEM_PROMPT}

CASE_INPUT:
{json.dumps(case_summary, indent=2)}

DECISION_BLOCK_JSON:
{decision.model_dump_json(indent=2)}

ALLOWED_CITATIONS:
{list(allowed_ids)}

RETRIEVED_CLAUSES:
{chr(10).join(clauses_text)}
"""

    if retry_feedback:
        prompt += f"\nCORRECTION REQUIRED (Previous Attempt Error):\n{retry_feedback}\nPlease correct citations immediately.\n"

    prompt += "\nGenerate the final AssistantResponse JSON now."
    return prompt
