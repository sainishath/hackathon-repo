import yaml
import pytest
from procurement.config import settings
from procurement.models import CaseInput
from procurement.pipeline import ProcurementPipeline


@pytest.fixture
def pipeline():
    return ProcurementPipeline()


def test_pipeline_all_10_cases(pipeline):
    cases_path = settings.eval_dir / "cases.yaml"
    with open(cases_path, "r", encoding="utf-8") as f:
        cases_data = yaml.safe_load(f)["cases"]

    assert len(cases_data) == 10

    for case_spec in cases_data:
        case_id = case_spec["id"]
        inp = CaseInput.model_validate(case_spec["input"])
        exp = case_spec["expected"]

        response = pipeline.run(inp)
        decision = response.decision

        # Check status matches
        assert (
            decision.status == exp["status"]
        ), f"Failed for {case_id}: expected {exp['status']} but got {decision.status}"

        # If expected matched_rule_id is specified
        if "matched_rule_id" in exp:
            assert decision.matched_rule_id == exp["matched_rule_id"]

        # If expected method is specified
        if "method" in exp:
            assert decision.method == exp["method"]

        # If DECIDED, steps and checklist should be populated and valid
        if decision.status == "DECIDED":
            assert len(response.steps) > 0
            assert len(response.checklist) > 0
            # Every step must have citations
            for step in response.steps:
                assert len(step.clause_ids) > 0
                for cid in step.clause_ids:
                    assert cid.startswith("FIXTURE-POLICY")

        # If NEEDS_INFO or ESCALATE, generation was skipped
        if decision.status in ("NEEDS_INFO", "ESCALATE"):
            assert len(response.steps) == 0
            assert len(response.checklist) == 0
            if decision.status == "NEEDS_INFO":
                assert len(response.missing_info) > 0
            if decision.status == "ESCALATE":
                assert len(response.escalations) > 0
