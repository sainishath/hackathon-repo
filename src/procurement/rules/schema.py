from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class RuleCondition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    category_in: list[str] = Field(
        default_factory=lambda: ["goods"],
        description="List of applicable procurement categories",
    )
    value_min: Optional[float] = Field(
        default=None, description="Lower threshold of procurement value in INR"
    )
    value_max: Optional[float] = Field(
        default=None, description="Upper threshold of procurement value in INR"
    )
    min_inclusive: bool = Field(
        default=True, description="Whether value_min is inclusive (val >= value_min)"
    )
    max_inclusive: bool = Field(
        default=True, description="Whether value_max is inclusive (val <= value_max)"
    )
    flags: dict[str, Any] = Field(
        default_factory=dict,
        description="Required boolean or specific flags, e.g. is_emergency: false",
    )


class RuleConsequence(BaseModel):
    model_config = ConfigDict(extra="ignore")

    method: str = Field(description="Procurement method name e.g. Direct Purchase")
    approver: str = Field(description="Designated sanctioning authority")
    min_quotations: int = Field(default=0, description="Minimum formal quotations needed")
    committee: bool = Field(default=False, description="Whether a committee is mandated")
    documents: list[str] = Field(
        default_factory=list, description="Mandatory forms/documents required"
    )


class RuleDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    rule_id: str = Field(description="Unique rule ID e.g. FIXTURE:RULE-101")
    clause_id: str = Field(description="Authoritative regulatory clause citation")
    description: Optional[str] = Field(default="", description="Summary of rule intent")
    when: RuleCondition
    then: RuleConsequence


class RulesConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: Optional[str] = Field(default="Institutional Procurement Rules Schema")
    required_inputs: list[str] = Field(
        default_factory=lambda: ["category", "estimated_value_inr", "item_description"],
        description="Fields required on CaseInput before rule evaluation can proceed",
    )
    rules: list[RuleDefinition] = Field(default_factory=list)
