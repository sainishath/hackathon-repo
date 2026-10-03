from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class Clause(BaseModel):
    model_config = ConfigDict(extra="ignore")

    clause_id: str = Field(description="Unique clause identifier e.g. DOCID:4.2.1")
    doc_id: str = Field(description="Document identifier")
    doc_title: str = Field(description="Human readable document title")
    doc_type: Literal["policy", "form", "guideline"] = Field(
        default="policy", description="Document type"
    )
    version: str = Field(description="Document version string e.g. v1.0")
    effective_date: str = Field(description="Effective date string e.g. 2024-01-01")
    section_path: str = Field(description="Hierarchical section path e.g. Chapter 4 > Section 2.1")
    page: int = Field(default=1, description="Page number in original document")
    text: str = Field(description="Raw text of the clause")
    is_current: bool = Field(default=True, description="Whether this clause is currently active")
    superseded_by: Optional[str] = Field(
        default=None, description="Clause ID that superseded this clause, if inactive"
    )
    authority_rank: Optional[int] = Field(
        default=1, description="Authority ranking (1=GFR, 2=Manual, 3=Annex, 4=Forms)"
    )


class ScoredClause(BaseModel):
    model_config = ConfigDict(extra="ignore")

    clause: Clause
    score: float


class CaseInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    item_description: Optional[str] = Field(
        default=None, description="Detailed description of the item or service to procure"
    )
    category: Optional[str] = Field(
        default="goods", description="Procurement category e.g. goods, services, works, consultancy"
    )
    estimated_value_inr: Optional[float] = Field(
        default=None, description="Total estimated procurement value in INR"
    )
    funding_source: Optional[str] = Field(
        default=None, description="Source of budget/grant funding"
    )
    is_emergency: Optional[bool] = Field(
        default=None, description="Whether procurement is an urgent emergency"
    )
    is_sole_source: Optional[bool] = Field(
        default=None, description="Whether item is available only from a proprietary single vendor"
    )
    quotations_received: Optional[int] = Field(
        default=None, description="Number of quotations currently received"
    )
    department: Optional[str] = Field(
        default=None, description="Originating department or division"
    )


class RuleDecision(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["DECIDED", "NEEDS_INFO", "ESCALATE"]
    matched_rule_id: Optional[str] = None
    method: Optional[str] = None
    approver: Optional[str] = None
    min_quotations: Optional[int] = None
    committee_required: Optional[bool] = None
    required_documents: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    escalation_reasons: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list, description="Authoritative clause IDs")


class StepItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    n: int = Field(description="Step sequence number")
    action: str = Field(description="Clear operational action to take")
    clause_ids: list[str] = Field(default_factory=list, description="Citations supporting this step")


class ChecklistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    item: str = Field(description="Checklist document or task requirement")
    form_id: Optional[str] = Field(default=None, description="Form template identifier if applicable")
    mandatory: bool = Field(default=True, description="Whether this item is mandatory")
    clause_ids: list[str] = Field(default_factory=list, description="Citations supporting this item")


class AssistantResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decision: RuleDecision = Field(
        description="Deterministic decision copied strictly from rules engine, never LLM-written"
    )
    summary: str = Field(description="Concise procurement guidance summary")
    steps: list[StepItem] = Field(default_factory=list, description="Cited sequential execution steps")
    checklist: list[ChecklistItem] = Field(
        default_factory=list, description="Cited mandatory & optional documents checklist"
    )
    missing_info: list[str] = Field(default_factory=list, description="Information missing for a decision")
    escalations: list[str] = Field(default_factory=list, description="Exceptions requiring human escalation")
