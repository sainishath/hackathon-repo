import os
from procurement.config import settings
from procurement.models import AssistantResponse
from procurement.generation.llm import GeminiLLMClient

print("Provider:", settings.llm_provider)
print("Gemini model:", settings.gemini_model)
print("Ollama model:", settings.ollama_model)

client = GeminiLLMClient()
prompt = """DECISION_BLOCK_JSON:
{
  "status": "DECIDED",
  "matched_rule_id": "RULE_DIRECT_PURCHASE",
  "method": "Direct Purchase without Quotation",
  "approver": "Head of Department (HoD)",
  "min_quotations": 0,
  "committee_required": false,
  "required_documents": ["Sanction Order", "Store Inward Slip", "Direct Purchase Certificate"],
  "missing_fields": [],
  "escalation_reasons": [],
  "citations": ["MGP-2024-C4.12", "INST-2026-DP1"]
}

ALLOWED_CITATIONS:
["MGP-2024-C4.12", "INST-2026-DP1"]

RETRIEVED_CLAUSES:
[MGP-2024-C4.12] Purchase of goods up to the value of Rs. 50,000 only on each occasion may be made without inviting quotations.
[INST-2026-DP1] Direct Purchase without quotation up to Rs. 50,000. Sanctioning authority: HoD.
"""

res = client.generate_json(prompt, AssistantResponse)
print("Keys returned:", list(res.keys()))
print("Summary:", res.get("summary"))
print("Steps count:", len(res.get("steps", [])))
print("Checklist count:", len(res.get("checklist", [])))
print("First step:", res.get("steps", [])[0] if res.get("steps") else None)
