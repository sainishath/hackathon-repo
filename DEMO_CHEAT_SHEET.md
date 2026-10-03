# PROCUREGUARD // Demonstration Cheat Sheet & Pitch Guide

> **Core Value Proposition for Judges:**
> *"The LLM never decides procurement thresholds, approvers, or purchase methods. A deterministic rules engine decides mathematically. The AI only drafts the cited procedural steps and checklists from the engine decision. If information is missing or unmapped, the system immediately escalates—it never hallucinates."*

---

## 🚀 Quick Launch

- **Application URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **FastAPI Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Local Startup Command (if restarting):**
  ```powershell
  $env:PYTHONPATH="src"; $env:PYTHONIOENCODING="utf-8"; uvicorn procurement.api:app --host 127.0.0.1 --port 8000
  ```

---

## 🎯 6 High-Impact Live Demo Scenarios

### Demo 1: The "1-Paisa" Boundary Test (Statutory Precision)
1. **Action:** Under **Quick Scenarios**, click **`₹50,000 Exact Limit (Direct Purchase)`**.
   - **Observe:**
     - Status: `APPROVED TO PROCEED (Rule Matched)` (Emerald)
     - Method: `Direct Purchase without Quotation`
     - Approver: `Head of Department (HoD)`
     - Rule ID: `RULE_DIRECT_PURCHASE`
     - Quotations: `0 Quotations` (No market survey required)
     - Latency: `< 5 ms`
2. **Action:** Now click **`₹50,000.01 (Requires Committee)`** (or change input to `50000.01`).
   - **Observe:**
     - Method flips immediately to: `Purchase by Local Purchase Committee`
     - Approver flips to: `Dean (R&D / Academic)`
     - Committee requirement flips to: `Mandatory (3 Members)`
     - Minimum Quotations flips to: `3 Quotations`
     - Rule ID: `RULE_PURCHASE_COMMITTEE`
3. **Pitch Line:** *"A standard LLM routinely rounds numbers or mixes up 2017 and 2024 thresholds. Our engine enforces the Government of India Goods Manual 2024 Para 4.12 limit down to the single paisa."*

---

### Demo 2: Missing Information Guardrail (Zero Hallucination)
1. **Action:** Click **`Missing Price (Needs Info)`** (or check `Omit value`).
2. **Observe:**
   - Status: `MORE INFORMATION NEEDED` (Amber badge)
   - Pipeline Stepper: Stage 01 highlights with an amber warning badge.
   - Banner: `Missing fields required for compliance check: estimated_value_inr`
   - Steps: Operational sequence suppressed to prevent unverified actions.
3. **Pitch Line:** *"Generative AI chatbots often guess missing amounts or assume defaults. PROCUREGUARD detects missing required fields and refuses to speculate."*

---

### Demo 3: Statutory Exceptions & Emergency Powers
1. **Action:** Click **`Single Brand / PAC (₹4 Lakh)`**.
   - **Observe:**
     - Checkbox `Proprietary Article (Single Brand / PAC)` is enabled.
     - Rule ID: `RULE_SOLE_SOURCE`
     - Approver: `Director`
     - Checklist mandates: `View SOLE_SOURCE_JUSTIFICATION`
2. **Action:** Click **`Lab Emergency (₹40,000)`**.
   - **Observe:**
     - Rule ID: `RULE_EMERGENCY`
     - Approver: `Head of Department (Report to Director within 48h)` under emergency provisions.

---

### Demo 4: Interactive Statutory Threshold Slider
1. **Action:** Drag the logarithmic range slider in Section 1.
2. **Observe:**
   - Value dynamically converts into Indian Rupees words (`₹ 50,000.00` -> `Rupees Fifty Thousand Only`).
   - The badge snaps magnetically across all 4 legal tiers:
     - `≤ ₹50,000`: `Direct Purchase (HoD)` (Emerald)
     - `₹50k – ₹5L`: `Local Purchase Committee (Dean)` (Cyan)
     - `₹5L – ₹25L`: `Limited Tender (Director)` (Purple)
     - `> ₹25L`: `Advertised Tender (Director / BoG)` (Blue)

---

### Demo 5: Verbatim Legal Proof & 2017 vs. 2024 Gazette Evolution
1. **Action:** In Section 3, click any green citation chip (e.g., `MGP-2024-C4.12` or `INST-2026-DP1`).
2. **Observe:**
   - Slide-over drawer opens showing the verbatim gazette text, document title, and effective date.
3. **Action:** Click the **`Old vs. New Rule (2017 vs. 2024)`** tab inside the drawer.
   - **Observe:**
     - Side-by-side legal diff highlighting how GFR 2017 Rule 154 (₹25,000 cap) was superseded by 2024 Goods Manual Para 4.12 (₹50,000 cap).

---

### Demo 6: Printable Document Templates & Telemetry Suite
1. **Action:** Under the Mandatory Checklist, click **`View FORM-INDENT`**, **`View FORM-CSQ`**, or **`View FORM-PCC`**.
   - **Observe:** High-fidelity markdown government template preview opens with a **`Print / Save as PDF`** button.
2. **Action:** Scroll to **`4. System Accuracy & Automated Tests`**.
   - **Observe:**
     - Multi-method retrieval accuracy table (BM25 vs. Dense vs. Hybrid RRF with 100% Top-1 Recall).
     - Click **`Re-run All 10 Tests`**: executes all 10 acceptance cases live, returning 10 green `✓ PASS` badges in seconds.

---

## 📊 Key Numbers Cheat Sheet

| Metric | Value | Reference |
| :--- | :--- | :--- |
| **Direct Purchase Cap** | **₹50,000** | Manual of Procurement of Goods 2024, Para 4.12 |
| **Superseded 2017 Direct Cap** | ₹25,000 | GFR 2017 Rule 154 *(Flagged as superseded)* |
| **Purchase Committee Cap** | **₹5,00,000** | Goods Manual 2024 Para 4.13 *(Up from ₹2.5L in 2017)* |
| **Limited Tender Cap** | **₹25,00,000** | Goods Manual 2024 Para 4.14 |
| **Top-1 Retrieval Recall** | **100%** | Hybrid Reciprocal Rank Fusion (RRF) |
| **Passing Test Suite** | **31 / 31 (100%)** | `pytest tests -v` |
| **Deterministic Lookup Latency** | **~2 ms** | In-memory rules & hybrid vector cache |
| **Active LLM Cascade** | **3-Tier** | Gemini 2.5 Flash -> Ollama Llama 3 -> Deterministic Mock |
