# Institutional Procurement Assistant

A production-ready hackathon skeleton for an **Institutional Procurement Assistant**, combining deterministic statutory rules with grounded Retrieval-Augmented Generation (RAG).

## Core Principle

> **The LLM never decides thresholds, approvers, or procurement methods.**
> A deterministic rules engine evaluates statutory bands, required inputs, and exception flags. The LLM only compiles cited sequential execution steps and compliance checklists grounded in authoritative regulatory clauses. If information is missing or an unhandled exception occurs, the system **escalates—never invents or guesses**.

---

## Architecture Overview

```
                      [CaseInput Intake]
                              │
                              ▼
                [Deterministic Rules Engine]
               (rules.yaml + Boundary Checks)
                    │                    │
          [NEEDS_INFO / ESCALATE]     [DECIDED]
                    │                    │
                    ▼                    ▼
             [Early Return]      [Hybrid Retrieval]
            (Skip Generation)    (BM25 + Dense RRF)
                                         │
                                         ▼
                                 [LLM Generation]
                               (Mock/Gemini/Ollama)
                                         │
                                         ▼
                             [Citation Verification]
                            (Retries / Downgrades)
                                         │
                                         ▼
                             [AssistantResponse Output]
```

1. **Deterministic Rules Engine (`src/procurement/rules/`):**
   - Validates mandatory fields from `rules.yaml: required_inputs`. Missing fields trigger `NEEDS_INFO`.
   - Explicit boundary inclusivity checks per rule (`min_inclusive`, `max_inclusive`).
   - Exception flags (`is_emergency`, `is_sole_source`) trigger immediate `ESCALATE` if not covered by a specialized rule.
   - Ambiguous/overlapping matches or unknown rules trigger `ESCALATE`.

2. **Hybrid Retrieval (`src/procurement/retrieval/`):**
   - Unified interface: `search(query, k, filters) -> list[ScoredClause]`.
   - **BM25:** Lexical term matching with tokenization.
   - **Dense:** 384-dimensional in-memory vector embeddings with offline deterministic projection fallback.
   - **Hybrid:** Reciprocal Rank Fusion (RRF) combining lexical and dense scores.
   - Default filter `is_current=True` with `include_superseded` support.

3. **Grounded Generation & Validation (`src/procurement/generation/`):**
   - Provider-agnostic LLM interface supporting `mock`, `gemini`, and `ollama`.
   - `validator.py` ensures every generated step and checklist item cites only clauses in `(retrieved_clauses + engine_citations)`.
   - On citation failure, retries once with error feedback; on secondary failure, downgrades to `ESCALATE` with audit notes.

---

## Repository Layout

```
procurement-assistant/
├── README.md                      # Documentation & architecture guide
├── requirements.txt               # Dependencies (Pydantic v2, Streamlit, PyMuPDF, etc.)
├── .env.example                   # Environment configuration template
├── Makefile                       # Workflow targets (setup, ingest, test, run, eval)
├── data/
│   ├── raw/                       # Source policy PDFs
│   ├── processed/
│   │   ├── clauses.jsonl          # Extracted & chunked policy clauses
│   │   ├── bm25.pkl               # Serialized BM25 index
│   │   └── dense.npz              # In-memory numpy vectors
│   ├── rules/
│   │   └── rules.yaml             # Statutory procurement bands and thresholds
│   ├── forms/                     # Markdown form templates (sanction, LPC, RFQ, etc.)
│   ├── eval/
│   │   ├── gold_retrieval.jsonl   # Benchmark query evaluation set
│   │   ├── cases.yaml             # 10 end-to-end acceptance test scenarios
│   │   └── results.json           # Evaluation metrics (Recall@k, MRR)
│   └── fixtures/                  # Tiny fake corpus & sample files (clearly marked FIXTURE)
├── src/procurement/
│   ├── config.py                  # Settings & path resolvers
│   ├── models.py                  # Pydantic v2 data models
│   ├── ingest/                    # PDF parsing, heading chunker, index builder
│   ├── rules/                     # Deterministic rules schema & engine
│   ├── retrieval/                 # BM25, Dense, Hybrid RRF, and benchmark evaluation
│   ├── generation/                # Switchable LLM clients, prompts, validator
│   └── pipeline.py                # End-to-end coordinator
├── app/
│   └── streamlit_app.py           # 3-tab interactive Streamlit interface
└── tests/                         # Full pytest test suite (boundary, chunker, retrieval, pipeline)
```

---

## Quickstart

### 1. Setup & Installation
```bash
pip install -r requirements.txt
```

### 2. Build Ingestion Indexes
```bash
# Ingests clauses and builds BM25 & dense indices
python -m procurement.ingest.build_index
```

### 3. Run Test Suite
```bash
python -m pytest tests -v
```

### 4. Run Retrieval Evaluation Benchmark
```bash
python -m procurement.retrieval.evaluate
```

### 5. Launch Streamlit Application
```bash
streamlit run app/streamlit_app.py
```

*(Or use `make setup`, `make ingest`, `make test`, `make eval`, `make run` if `make` is installed on your OS).*

---

## Switching LLM Providers

Set the `LLM_PROVIDER` environment variable or edit `.env`:

- `LLM_PROVIDER=mock` (Default): Returns deterministic canned JSON based on engine decisions for 100% offline tests.
- `LLM_PROVIDER=gemini`: Set `GEMINI_API_KEY=your_key`.
- `LLM_PROVIDER=ollama`: Set `OLLAMA_BASE_URL=http://localhost:11434` and `OLLAMA_MODEL=llama3`.
