import time
import json
from pathlib import Path
from typing import Optional, Any
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from procurement.config import settings
from procurement.models import CaseInput, AssistantResponse, Clause
from procurement.pipeline import ProcurementPipeline
from procurement.retrieval.evaluate import run_evaluation

app = FastAPI(
    title="Institutional Procurement Compliance Engine",
    description="Statutory GFR 2017 & Goods Manual 2024 Compliance & Grounded Retrieval Engine",
    version="2.0.0",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton pipeline
pipeline = ProcurementPipeline()

# In-memory clause cache
clauses_cache: dict[str, Clause] = {}


def load_clauses_cache() -> dict[str, Clause]:
    global clauses_cache
    if not clauses_cache and settings.clauses_file.exists():
        with open(settings.clauses_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    c = Clause.model_validate_json(line)
                    clauses_cache[c.clause_id] = c
    return clauses_cache


@app.on_event("startup")
def startup_event():
    load_clauses_cache()


@app.post("/api/evaluate")
def evaluate_case(case_input: CaseInput):
    """Evaluate procurement case against deterministic rules and generate grounded directives."""
    t0 = time.perf_counter()
    response: AssistantResponse = pipeline.process(case_input)
    t1 = time.perf_counter()

    latency_ms = round((t1 - t0) * 1000, 2)
    result = response.model_dump(by_alias=True)
    result["latency_ms"] = latency_ms
    result["_provider_used"] = getattr(response, "provider_used", None) or result.get("_provider_used", "deterministic-mock")

    # Detailed stage statuses for the visual pipeline stepper
    dec = response.decision
    stages = {
        "intake_gating": "passed" if dec.status != "NEEDS_INFO" else "failed",
        "rules_engine": "completed",
        "retrieval": "completed" if dec.status == "DECIDED" else "skipped",
        "citation_validation": "completed" if dec.status == "DECIDED" else "skipped",
    }
    result["stages"] = stages
    return result


@app.get("/api/presets")
def get_presets():
    """Retrieve 10 benchmark evaluation scenarios from cases.yaml."""
    cases_path = settings.eval_dir / "cases.yaml"
    if not cases_path.exists():
        raise HTTPException(status_code=404, detail="cases.yaml not found")
    with open(cases_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("cases", [])


@app.get("/api/benchmarks")
def get_benchmarks():
    """Retrieve retrieval evaluation metrics (Recall@1/3/5, MRR) for BM25, Dense, and Hybrid."""
    results_path = settings.eval_dir / "results.json"
    if results_path.exists():
        with open(results_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return run_evaluation()


@app.get("/api/clause/{clause_id}")
def get_clause_details(clause_id: str):
    """Retrieve full text, doc version, effective date, and metadata for a specific clause."""
    cache = load_clauses_cache()
    if clause_id in cache:
        return cache[clause_id].model_dump()
    raise HTTPException(status_code=404, detail=f"Clause '{clause_id}' not found in registry")


@app.get("/api/form/{form_id}")
def get_form_template(form_id: str):
    """Retrieve markdown text and template structure of a procurement form."""
    normalized_name = form_id.lower()
    if not normalized_name.endswith(".md"):
        # map FORM-INDENT -> form_indent.md, etc.
        mapping = {
            "form-indent": "form_indent.md",
            "form-csq": "form_csq.md",
            "form-pcc": "form_pcc.md",
            "sanction_order": "sanction_order.md",
            "rfq_template": "rfq_template.md",
            "sole_source_justification": "sole_source_justification.md",
            "lpc_constitution": "lpc_constitution.md",
        }
        normalized_name = mapping.get(normalized_name, f"{normalized_name}.md")

    form_file = settings.forms_dir / normalized_name
    if not form_file.exists():
        raise HTTPException(status_code=404, detail=f"Form '{form_id}' not found")

    content = form_file.read_text(encoding="utf-8")
    return {"form_id": form_id, "file_name": normalized_name, "content": content}


# Mount static files and frontend index
frontend_dir = settings.repo_root / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

    @app.get("/")
    def serve_frontend_index():
        index_file = frontend_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"status": "online", "message": "Institutional Procurement API Server active"}
