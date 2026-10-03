import os
import sys
import json
import yaml
from pathlib import Path
import streamlit as st

# Add src to sys.path so procurement package is discoverable
APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent
SRC_DIR = REPO_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from procurement.config import settings
from procurement.models import CaseInput, AssistantResponse, Clause
from procurement.rules.engine import RulesEngine
from procurement.retrieval.evaluate import run_evaluation
from procurement.pipeline import ProcurementPipeline

st.set_page_config(
    page_title="Institutional Procurement Assistant",
    page_icon="📋",
    layout="wide",
)

st.title("🏛️ Institutional Procurement Assistant")
st.caption(
    "Deterministic Rules Engine + Grounded Retrieval-Augmented Generation (RAG) | LLM Provider: "
    f"`{settings.llm_provider}`"
)


@st.cache_resource
def get_pipeline():
    return ProcurementPipeline()


@st.cache_data
def load_rules_config():
    with open(settings.rules_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


@st.cache_data
def load_eval_cases():
    cases_path = settings.eval_dir / "cases.yaml"
    with open(cases_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("cases", [])


@st.cache_data
def load_all_clauses():
    clauses: dict[str, Clause] = {}
    if settings.clauses_file.exists():
        with open(settings.clauses_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    c = Clause.model_validate_json(line)
                    clauses[c.clause_id] = c
    return clauses


rules_data = load_rules_config()
required_inputs = rules_data.get("required_inputs", [])
all_clauses_map = load_all_clauses()
pipeline = get_pipeline()

tab_form, tab_response, tab_eval = st.tabs(
    ["📝 (1) Guided Form", "📊 (2) Response View", "🧪 (3) Evaluation & Cases"]
)

# -------------------------------------------------------------
# TAB 1: GUIDED FORM (Dynamic from rules.yaml required_inputs)
# -------------------------------------------------------------
with tab_form:
    st.subheader("Procurement Proposal Intake")
    st.info(
        "Fields marked with ⚡ are dynamically validated against institutional rules. "
        "The deterministic rules engine decides the sanction threshold before generation.",
        icon="ℹ️",
    )

    eval_cases = load_eval_cases()
    case_options = ["Custom Entry"] + [f"{c['id']} - {c['name']}" for c in eval_cases]
    selected_preset = st.selectbox("Load Test Case Preset (Optional):", case_options)

    preset_input = {}
    if selected_preset != "Custom Entry":
        selected_id = selected_preset.split(" - ")[0]
        for c in eval_cases:
            if c["id"] == selected_id:
                preset_input = c.get("input", {})
                break

    with st.form("procurement_intake_form"):
        col1, col2 = st.columns(2)

        with col1:
            req_marker = " ⚡ (Required)" if "category" in required_inputs else ""
            cat_val = preset_input.get("category", "goods")
            cat_idx = ["goods", "services", "works"].index(cat_val) if cat_val in ["goods", "services", "works"] else 0
            category = st.selectbox(
                f"Procurement Category{req_marker}",
                options=["goods", "services", "works"],
                index=cat_idx,
                help="Goods, consulting/outsourced services, or civil/electrical works.",
            )

            req_marker_val = " ⚡ (Required)" if "estimated_value_inr" in required_inputs else ""
            default_val = float(preset_input.get("estimated_value_inr") or 0.0)
            use_none_val = preset_input.get("estimated_value_inr") is None and selected_preset != "Custom Entry"
            
            val_input = st.number_input(
                f"Estimated Total Value (INR){req_marker_val}",
                min_value=0.0,
                max_value=1e9,
                value=0.0 if use_none_val else default_val,
                step=5000.0,
                format="%.2f",
            )
            val_final = None if use_none_val or (val_input == 0.0 and selected_preset == "Custom Entry" and "estimated_value_inr" in required_inputs and st.checkbox("Leave estimated value unspecified (test NEEDS_INFO)", value=False)) else val_input

            funding_source = st.text_input(
                "Funding Source / Budget Head",
                value=preset_input.get("funding_source", "Institute Operating Budget"),
            )

            department = st.text_input(
                "Department / Originating Unit",
                value=preset_input.get("department", "Computer Science & Engineering"),
            )

        with col2:
            req_marker_desc = " ⚡ (Required)" if "item_description" in required_inputs else ""
            item_description = st.text_area(
                f"Item or Service Description{req_marker_desc}",
                value=preset_input.get("item_description", "High-performance computing server nodes and rack accessories"),
                height=100,
            )

            quotations_received = st.number_input(
                "Quotations Already Received",
                min_value=0,
                max_value=50,
                value=int(preset_input.get("quotations_received", 0)),
                step=1,
            )

            st.write("**Special Operational Flags:**")
            is_emergency = st.checkbox(
                "Urgent / Emergency Procurement",
                value=bool(preset_input.get("is_emergency", False)),
                help="Triggers statutory escalation if not covered by explicit emergency rule.",
            )
            is_sole_source = st.checkbox(
                "Proprietary / Sole Source Article",
                value=bool(preset_input.get("is_sole_source", False)),
                help="Only one manufacturer exists; requires PAC form and committee review.",
            )

        submit_btn = st.form_submit_button("⚡ Evaluate & Process Procurement Proposal", type="primary")

    if submit_btn:
        case = CaseInput(
            category=category,
            estimated_value_inr=val_final,
            item_description=item_description.strip() if item_description else None,
            funding_source=funding_source,
            department=department,
            quotations_received=quotations_received,
            is_emergency=is_emergency,
            is_sole_source=is_sole_source,
        )

        with st.spinner("Evaluating deterministic rules and retrieving clauses..."):
            response = pipeline.run(case)
            st.session_state["response"] = response
            st.session_state["last_case"] = case
            st.success("Evaluation complete! Switch to Tab (2) Response View to inspect results.")

# -------------------------------------------------------------
# TAB 2: RESPONSE VIEW
# -------------------------------------------------------------
with tab_response:
    st.subheader("Grounded Procurement Directive")

    if "response" not in st.session_state:
        st.info("No proposal has been evaluated yet. Complete the form in Tab 1 and submit.")
    else:
        resp: AssistantResponse = st.session_state["response"]
        dec = resp.decision

        # Status badge header
        status_col, summary_col = st.columns([1, 3])
        with status_col:
            if dec.status == "DECIDED":
                st.markdown("### Status: :green[● DECIDED]")
                st.caption(f"Rule ID: `{dec.matched_rule_id}`")
            elif dec.status == "NEEDS_INFO":
                st.markdown("### Status: :orange[▲ NEEDS_INFO]")
            else:
                st.markdown("### Status: :red[✕ ESCALATE]")

        with summary_col:
            st.markdown(f"**Directive Summary:** {resp.summary}")

        st.divider()

        # Escalation or Needs Info Banners
        if dec.status == "ESCALATE":
            st.error("### ⚠️ Exception Escalation Triggered")
            for reason in dec.escalation_reasons:
                st.markdown(f"- **{reason}**")

        if dec.status == "NEEDS_INFO":
            st.warning("### ⚠️ Incomplete Proposal Inputs")
            st.markdown(
                f"Missing required fields: {', '.join([f'`{f}`' for f in dec.missing_fields])}. "
                "Please update proposal details in Tab 1."
            )

        # Decided Details Cards
        if dec.status == "DECIDED":
            m_col1, m_col2, m_col3, m_col4 = st.columns(4)
            m_col1.metric("Authorized Method", dec.method or "N/A")
            m_col2.metric("Sanctioning Authority", dec.approver or "N/A")
            m_col3.metric("Min. Quotations", dec.min_quotations if dec.min_quotations is not None else 0)
            m_col4.metric("Committee Mandated", "Yes" if dec.committee_required else "No")

            # Sequential Steps
            st.markdown("### 📋 Sequenced Operational Steps")
            if not resp.steps:
                st.write("No steps generated.")
            for step in resp.steps:
                chips = " ".join([f"`[{cid}]`" for cid in step.clause_ids])
                st.markdown(f"**Step {step.n}:** {step.action} {chips}")

            st.markdown("### 📑 Compliance Checklist & Form Templates")
            for item in resp.checklist:
                col_chk, col_form = st.columns([3, 1])
                chips = " ".join([f"`[{cid}]`" for cid in item.clause_ids])
                with col_chk:
                    badge = "*(Mandatory)*" if item.mandatory else "*(Optional)*"
                    st.markdown(f"- [x] **{item.item}** {badge} {chips}")
                with col_form:
                    if item.form_id:
                        form_file = settings.forms_dir / item.form_id
                        if form_file.exists():
                            with st.popover(f"View {item.form_id}"):
                                st.markdown(form_file.read_text(encoding="utf-8"))

            # Expander for Cited Regulatory Clauses
            all_cited_ids = set(dec.citations)
            for s in resp.steps:
                all_cited_ids.update(s.clause_ids)
            for c in resp.checklist:
                all_cited_ids.update(c.clause_ids)

            with st.expander("🔍 Authoritative Regulatory Clauses Cited", expanded=False):
                for cid in sorted(all_cited_ids):
                    clause = all_clauses_map.get(cid)
                    if clause:
                        status_chip = ":green[Active]" if clause.is_current else ":red[Superseded]"
                        st.markdown(
                            f"#### `{clause.clause_id}`: {clause.section_path} ({status_chip})\n"
                            f"**Document:** {clause.doc_title} ({clause.version}) | "
                            f"**Effective Date:** {clause.effective_date} | **Page:** {clause.page}\n\n"
                            f"> {clause.text}"
                        )
                        st.divider()
                    else:
                        st.markdown(f"- Unknown Clause ID: `{cid}`")

# -------------------------------------------------------------
# TAB 3: EVALUATION & TEST CASES
# -------------------------------------------------------------
with tab_eval:
    st.subheader("System Benchmarking & Acceptance Test Suite")

    col_btn, col_info = st.columns([1, 2])
    with col_btn:
        run_bench = st.button("🚀 Re-run Retrieval Benchmark", type="secondary")

    results_file = settings.eval_dir / "results.json"
    if run_bench or not results_file.exists():
        with st.spinner("Evaluating BM25, Dense, and Hybrid retrievers against gold standard queries..."):
            eval_data = run_evaluation()
    else:
        with open(results_file, "r", encoding="utf-8") as f:
            eval_data = json.load(f)

    st.markdown("#### 1. Retrieval Performance Comparison")
    methods_data = eval_data.get("methods", {})
    table_rows = []
    for method_name, metrics in methods_data.items():
        table_rows.append(
            {
                "Retriever": method_name.upper(),
                "Recall @ 1": f"{metrics.get('recall@1', 0.0) * 100:.1f}%",
                "Recall @ 3": f"{metrics.get('recall@3', 0.0) * 100:.1f}%",
                "Recall @ 5": f"{metrics.get('recall@5', 0.0) * 100:.1f}%",
                "MRR": f"{metrics.get('mrr', 0.0):.4f}",
            }
        )
    st.table(table_rows)

    st.markdown("#### 2. End-to-End Test Cases (10 Acceptance Scenarios)")
    cases = load_eval_cases()
    if st.button("▶ Run All 10 End-to-End Cases", type="primary"):
        test_results = []
        for c in cases:
            c_input = CaseInput.model_validate(c["input"])
            expected = c["expected"]
            actual_resp = pipeline.run(c_input)
            actual_dec = actual_resp.decision

            status_pass = actual_dec.status == expected["status"]
            method_pass = (
                expected.get("method") is None
                or actual_dec.method == expected.get("method")
            )
            rule_pass = (
                expected.get("matched_rule_id") is None
                or actual_dec.matched_rule_id == expected.get("matched_rule_id")
            )
            is_pass = status_pass and method_pass and rule_pass

            test_results.append(
                {
                    "Case ID": c["id"],
                    "Scenario": c["name"],
                    "Expected Status": expected["status"],
                    "Actual Status": actual_dec.status,
                    "Matched Rule": actual_dec.matched_rule_id or "None",
                    "Outcome": "✅ PASS" if is_pass else "❌ FAIL",
                }
            )

        st.table(test_results)
        all_passed = all(r["Outcome"] == "✅ PASS" for r in test_results)
        if all_passed:
            st.success("🎉 All 10 End-to-End Test Cases Passed!")
        else:
            st.error("Some test cases failed.")
    else:
        st.caption("Click the button above to execute the 10 validation cases.")
