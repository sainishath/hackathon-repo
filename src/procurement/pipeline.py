from typing import Optional
from procurement.models import CaseInput, AssistantResponse, ScoredClause
from procurement.rules.engine import RulesEngine
from procurement.retrieval.base import BaseRetriever
from procurement.retrieval.hybrid import HybridRetriever
from procurement.generation.llm import BaseLLMClient, get_llm_client
from procurement.generation.generate import generate_response


class ProcurementPipeline:
    """End-to-end Institutional Procurement Assistant Pipeline.
    
    Architecture:
    Completeness check & Rules Engine -> (if NEEDS_INFO / ESCALATE, early return)
    -> Hybrid Retrieval (BM25 + Dense RRF) -> LLM Generation -> Citation Validator -> AssistantResponse
    """

    def __init__(
        self,
        engine: Optional[RulesEngine] = None,
        retriever: Optional[BaseRetriever] = None,
        llm_client: Optional[BaseLLMClient] = None,
    ):
        self.engine = engine or RulesEngine()
        self.retriever = retriever or HybridRetriever()
        self.llm_client = llm_client or get_llm_client()

    def run(self, case: CaseInput) -> AssistantResponse:
        """Execute full pipeline for a given procurement case."""
        # 1. Deterministic Rules Engine Evaluation (incorporates completeness check)
        decision = self.engine.evaluate(case)

        # 2. Early exit for incomplete or escalated cases (LLM is bypassed)
        if decision.status in ("NEEDS_INFO", "ESCALATE"):
            summary_msg = (
                f"Information required: {', '.join(decision.missing_fields)}"
                if decision.status == "NEEDS_INFO"
                else f"Escalation required: {'; '.join(decision.escalation_reasons)}"
            )
            item_desc = case.item_description or "Requisition"
            val_str = f"₹{case.estimated_value_inr:,.2f}" if case.estimated_value_inr is not None else "Unspecified Amount"
            memo = (
                f"### Statutory Procurement Compliance Memo\n\n"
                f"**1. Requisition Understanding**: Requisition for '{item_desc}' estimated at {val_str}.\n\n"
                f"**2. Why This Rule Applies**: Intake gating identified status **{decision.status}**.\n\n"
                f"**3. Identified Issues / Edge Cases**: Mandatory parameters are missing or require administrative escalation: {summary_msg}.\n\n"
                f"**4. Step-by-Step Action Roadmap**: Provide missing procurement parameters (e.g. estimated financial value) or consult competent authority.\n\n"
                f"**5. Required Forms & Approvals**: Complete standard indent form with approved cost estimate."
            )
            return AssistantResponse(
                decision=decision,
                summary=summary_msg,
                compliance_memo=memo,
                steps=[],
                checklist=[],
                missing_info=decision.missing_fields,
                escalations=decision.escalation_reasons,
            )

        # 3. Retrieve relevant regulatory clauses
        query = (
            f"{case.category or ''} {case.item_description or ''} "
            f"{decision.method or ''} {case.estimated_value_inr or ''} INR"
        ).strip()
        retrieved_clauses = self.retriever.search(query, k=5)

        # 4. Generate & validate structured response
        response = generate_response(
            case=case,
            decision=decision,
            retrieved_clauses=retrieved_clauses,
            llm_client=self.llm_client,
        )

        return response

    process = run
