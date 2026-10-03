from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator


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
        description="Required boolean or specific flags, e.g. is_emergency: true",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_condition(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Support min_value / value_min
            if "min_value" in data and "value_min" not in data:
                data["value_min"] = data["min_value"]
            # Support max_value / value_max
            if "max_value" in data and "value_max" not in data:
                data["value_max"] = data["max_value"]
            # Support inclusive_min / min_inclusive
            if "inclusive_min" in data and "min_inclusive" not in data:
                data["min_inclusive"] = data["inclusive_min"]
            # Support inclusive_max / max_inclusive
            if "inclusive_max" in data and "max_inclusive" not in data:
                data["max_inclusive"] = data["inclusive_max"]
            # Support inline flags
            flags = data.setdefault("flags", {})
            if "is_emergency" in data:
                flags["is_emergency"] = data["is_emergency"]
            if "is_sole_source" in data:
                flags["is_sole_source"] = data["is_sole_source"]
        return data


class RuleConsequence(BaseModel):
    model_config = ConfigDict(extra="ignore")

    method: str = Field(description="Procurement method name e.g. Direct Purchase")
    approver: str = Field(description="Designated sanctioning authority")
    min_quotations: int = Field(default=0, description="Minimum formal quotations needed")
    committee_required: bool = Field(default=False, description="Whether a committee is mandated")
    required_documents: list[str] = Field(
        default_factory=list, description="Mandatory forms/documents required"
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_consequence(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "committee" in data and "committee_required" not in data:
                data["committee_required"] = data["committee"]
            elif "committee_required" in data and "committee" not in data:
                data["committee"] = data["committee_required"]
            if "documents" in data and "required_documents" not in data:
                data["required_documents"] = data["documents"]
            elif "required_documents" in data and "documents" not in data:
                data["documents"] = data["required_documents"]
        return data

    @property
    def committee(self) -> bool:
        return self.committee_required

    @property
    def documents(self) -> list[str]:
        return self.required_documents


class RuleDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    rule_id: str = Field(description="Unique rule ID e.g. RULE_DIRECT_PURCHASE")
    citations: list[str] = Field(
        default_factory=list, description="Authoritative regulatory clause citations"
    )
    clause_id: Optional[str] = Field(
        default=None, description="Primary regulatory clause citation for backwards compatibility"
    )
    description: Optional[str] = Field(default="", description="Summary of rule intent")
    when: RuleCondition
    then: RuleConsequence

    @model_validator(mode="before")
    @classmethod
    def normalize_definition(cls, data: Any) -> Any:
        if isinstance(data, dict):
            cits = data.get("citations")
            cid = data.get("clause_id")
            if cits and not cid:
                if isinstance(cits, list) and cits:
                    data["clause_id"] = str(cits[0])
            elif cid and not cits:
                data["citations"] = [str(cid)]
            elif not cits and not cid:
                data["citations"] = []
                data["clause_id"] = data.get("rule_id", "RULE-UNKNOWN")
        return data


class RulesConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: Optional[str] = Field(default="Institutional Procurement Rules Schema")
    required_inputs: list[str] = Field(
        default_factory=lambda: ["category", "estimated_value_inr", "item_description"],
        description="Fields required on CaseInput before rule evaluation can proceed",
    )
    rules: list[RuleDefinition] = Field(default_factory=list)
