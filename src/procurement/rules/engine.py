from pathlib import Path
from typing import Optional, Union
import yaml

from procurement.config import settings
from procurement.models import CaseInput, RuleDecision
from procurement.rules.schema import RulesConfig, RuleDefinition


class RulesEngine:
    """Deterministic rules engine for institutional procurement decisions."""

    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        self.config_path = Path(config_path or settings.rules_path)
        self.config: RulesConfig = self._load_config(self.config_path)

    def _load_config(self, path: Path) -> RulesConfig:
        if not path.exists():
            raise FileNotFoundError(f"Rules configuration file not found at: {path}")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return RulesConfig.model_validate(data)

    def reload(self) -> None:
        """Reload configuration from disk."""
        self.config = self._load_config(self.config_path)

    def evaluate(self, case: CaseInput) -> RuleDecision:
        """Evaluate a CaseInput against loaded rules.

        Returns RuleDecision with status DECIDED, NEEDS_INFO, or ESCALATE.
        The LLM never makes threshold/approver decisions - this engine does.
        """
        # 1. Verify required inputs
        missing_fields: list[str] = []
        for field in self.config.required_inputs:
            val = getattr(case, field, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                missing_fields.append(field)

        if missing_fields:
            return RuleDecision(
                status="NEEDS_INFO",
                missing_fields=missing_fields,
                escalation_reasons=[
                    f"Missing mandatory procurement fields: {', '.join(missing_fields)}"
                ],
            )

        # 2. Match rules
        matching_rules: list[RuleDefinition] = []

        for rule in self.config.rules:
            # Check category match
            if case.category not in rule.when.category_in:
                continue

            # Check value thresholds with explicit boundary inclusivity
            val = case.estimated_value_inr
            if val is not None:
                if rule.when.value_min is not None:
                    if rule.when.min_inclusive:
                        if val < rule.when.value_min:
                            continue
                    else:
                        if val <= rule.when.value_min:
                            continue

                if rule.when.value_max is not None:
                    if rule.when.max_inclusive:
                        if val > rule.when.value_max:
                            continue
                    else:
                        if val >= rule.when.value_max:
                            continue

            # Check exception / condition flags
            # If case has exception flags active (e.g. emergency / sole source),
            # rule must explicitly match that flag. Standard rules cannot absorb
            # unhandled emergency or sole source requests.
            flag_mismatch = False

            # Explicit flags defined on rule
            for flag_key, expected_val in rule.when.flags.items():
                case_flag_val = getattr(case, flag_key, None)
                if case_flag_val != expected_val:
                    flag_mismatch = True
                    break

            if flag_mismatch:
                continue

            # Exception check: if case has emergency=True but rule did not declare is_emergency: true
            if case.is_emergency is True and not rule.when.flags.get("is_emergency", False):
                continue

            # Exception check: if case has sole_source=True but rule did not declare is_sole_source: true
            if case.is_sole_source is True and not rule.when.flags.get("is_sole_source", False):
                continue

            matching_rules.append(rule)

        # 3. Decision arbitration
        if not matching_rules:
            escalations: list[str] = []
            if case.is_emergency is True:
                escalations.append(
                    "Emergency procurement exception declared: no designated emergency rule; requires special urgency sanction."
                )
            if case.is_sole_source is True:
                escalations.append(
                    "Sole source / proprietary procurement exception declared: proprietary certificate & competent committee approval required."
                )
            if not escalations:
                escalations.append(
                    f"No matching procurement rule found for category='{case.category}' and value={case.estimated_value_inr} INR."
                )
            return RuleDecision(status="ESCALATE", escalation_reasons=escalations)

        if len(matching_rules) > 1:
            rule_ids = [r.rule_id for r in matching_rules]
            return RuleDecision(
                status="ESCALATE",
                escalation_reasons=[
                    f"Ambiguity detected: multiple overlapping rules matched ({', '.join(rule_ids)}). Escalating to procurement officer."
                ],
            )

        # Exactly one rule matched => DECIDED
        matched = matching_rules[0]
        return RuleDecision(
            status="DECIDED",
            matched_rule_id=matched.rule_id,
            method=matched.then.method,
            approver=matched.then.approver,
            min_quotations=matched.then.min_quotations,
            committee_required=matched.then.committee,
            required_documents=matched.then.documents,
            citations=[matched.clause_id],
        )
