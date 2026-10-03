import os
import json
import re
from abc import ABC, abstractmethod
from typing import Optional, Any
from pydantic import BaseModel

from procurement.config import settings


class BaseLLMClient(ABC):
    """Abstract base LLM client returning structured JSON."""

    @abstractmethod
    def generate_json(self, prompt: str, response_schema: type[BaseModel]) -> dict[str, Any]:
        """Generate structured response conforming to the given Pydantic model."""
        pass


class MockLLMClient(BaseLLMClient):
    """Deterministic offline mock LLM client for tests and offline usage."""

    def generate_json(self, prompt: str, response_schema: type[BaseModel]) -> dict[str, Any]:
        # Extract decision block if embedded in the prompt
        # We construct a high-fidelity compliant mock AssistantResponse
        decision_match = re.search(
            r"DECISION_BLOCK_JSON:\s*(\{.+?\})\s*(?:ALLOWED_CITATIONS|RETRIEVED_CLAUSES):",
            prompt,
            re.DOTALL,
        )
        decision_data: dict[str, Any] = {}
        if decision_match:
            try:
                decision_data = json.loads(decision_match.group(1))
            except Exception:
                pass

        citations = decision_data.get("citations", ["MGP-2024-C4.12"])
        primary_citation = citations[0] if citations else "MGP-2024-C4.12"
        method = decision_data.get("method", "Standard Procurement")
        approver = decision_data.get("approver", "Competent Financial Authority")
        min_quotes = decision_data.get("min_quotations", 3)
        req_docs = decision_data.get("required_documents", ["Sanction Order"])

        # Steps citing valid authoritative citations
        steps = [
            {
                "n": 1,
                "action": f"Verify financial sanction requirements and budget head approval from {approver}.",
                "clause_ids": citations,
            },
            {
                "n": 2,
                "action": f"Execute procurement method '{method}' ensuring compliance with statutory thresholds.",
                "clause_ids": citations,
            },
            {
                "n": 3,
                "action": f"Obtain at least {min_quotes} competitive quotation(s) or proceed with authorized direct purchase.",
                "clause_ids": citations,
            },
            {
                "n": 4,
                "action": f"Submit documentation to {approver} for sanction order issuance and store inwarding.",
                "clause_ids": citations,
            },
        ]

        # Checklist matching required documents
        checklist = []
        for doc in req_docs:
            form_id = None
            if "INDENT" in doc or "Indent" in doc:
                form_id = "form_indent.md"
            elif "CSQ" in doc or "Comparative" in doc:
                form_id = "form_csq.md"
            elif "PCC" in doc:
                form_id = "form_pcc.md"
            elif "Sanction" in doc:
                form_id = "sanction_order.md"
            elif "LPC" in doc or "Survey" in doc:
                form_id = "lpc_constitution.md"
            elif "Tender" in doc or "Notice" in doc:
                form_id = "rfq_template.md"
            elif "Proprietary" in doc or "PAC" in doc:
                form_id = "sole_source_justification.md"

            checklist.append(
                {
                    "item": doc,
                    "form_id": form_id,
                    "mandatory": True,
                    "clause_ids": [primary_citation],
                }
            )

        mock_payload = {
            "decision": decision_data,
            "summary": f"Procurement authorized via {method}. Financial sanction required from {approver}.",
            "steps": steps,
            "checklist": checklist,
            "missing_info": decision_data.get("missing_fields", []),
            "escalations": decision_data.get("escalation_reasons", []),
        }

        return mock_payload


def _clean_json_str(text: str) -> str:
    """Strips markdown code blocks and whitespace from JSON string."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


class OllamaLLMClient(BaseLLMClient):
    """Client for local Ollama instance with structured JSON output and Mock fallback."""

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model

    def generate_json(self, prompt: str, response_schema: type[BaseModel]) -> dict[str, Any]:
        import requests

        schema_json = json.dumps(response_schema.model_json_schema())
        system_instruction = (
            "You are an Institutional Procurement Assistant. Follow rules strictly. "
            "You MUST respond ONLY with valid JSON conforming to the following JSON Schema:\n"
            f"{schema_json}"
        )

        payload = {
            "model": self.model,
            "prompt": f"{system_instruction}\n\nUser Request:\n{prompt}",
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1},
        }

        try:
            resp = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=45)
            resp.raise_for_status()
            res_json = resp.json()
            raw_response = res_json.get("response", "{}")
            clean_text = _clean_json_str(raw_response)
            return json.loads(clean_text)
        except Exception as e:
            print(f"[WARN] Ollama request failed ({e}); falling back to mock provider.")
            return MockLLMClient().generate_json(prompt, response_schema)


class GeminiLLMClient(BaseLLMClient):
    """Client for Google Gemini API with resilient fallback to Ollama and Mock."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        self.model = model or settings.gemini_model

    def generate_json(self, prompt: str, response_schema: type[BaseModel]) -> dict[str, Any]:
        if not self.api_key:
            print("[WARN] GEMINI_API_KEY not set; falling back to Ollama client.")
            return OllamaLLMClient().generate_json(prompt, response_schema)

        schema_json = json.dumps(response_schema.model_json_schema())
        full_prompt = (
            f"You are an Institutional Procurement Assistant adhering to statutory procurement rules.\n"
            f"Output strictly valid JSON conforming to schema:\n{schema_json}\n\n"
            f"{prompt}"
        )

        # 1. Try modern google.genai SDK
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            resp = client.models.generate_content(
                model=self.model,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            clean_text = _clean_json_str(resp.text)
            return json.loads(clean_text)
        except Exception as e_genai:
            print(f"[WARN] google.genai request failed ({e_genai}); attempting legacy google.generativeai...")
            try:
                import warnings

                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", category=FutureWarning)
                    import google.generativeai as legacy_genai

                legacy_genai.configure(api_key=self.api_key)
                model_inst = legacy_genai.GenerativeModel(self.model)
                resp = model_inst.generate_content(
                    full_prompt,
                    generation_config={"response_mime_type": "application/json", "temperature": 0.1},
                )
                clean_text = _clean_json_str(resp.text)
                return json.loads(clean_text)
            except Exception as e_legacy:
                print(f"[WARN] Gemini API request failed ({e_legacy}); falling back to Ollama provider.")
                return OllamaLLMClient().generate_json(prompt, response_schema)


def get_llm_client(provider: Optional[str] = None) -> BaseLLMClient:
    """Factory to retrieve switchable LLM client."""
    prov = (provider or settings.llm_provider).lower()
    if prov == "gemini":
        return GeminiLLMClient()
    elif prov == "ollama":
        return OllamaLLMClient()
    return MockLLMClient()
