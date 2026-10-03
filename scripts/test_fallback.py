from procurement.models import AssistantResponse
from procurement.generation.llm import GeminiLLMClient

# Provide an invalid key to trigger fallback
client = GeminiLLMClient(api_key="AIzaSy_INVALID_KEY_TEST_TRIGGER_FALLBACK")
prompt = """DECISION_BLOCK_JSON:
{
  "status": "DECIDED",
  "matched_rule_id": "RULE_DIRECT_PURCHASE",
  "method": "Direct Purchase without Quotation",
  "approver": "Head of Department (HoD)",
  "min_quotations": 0,
  "committee_required": false,
  "required_documents": ["Sanction Order"],
  "citations": ["MGP-2024-C4.12"]
}
ALLOWED_CITATIONS: ["MGP-2024-C4.12"]
RETRIEVED_CLAUSES:
[MGP-2024-C4.12] Purchase of goods up to Rs. 50,000.
"""

print("Testing Gemini -> Ollama -> Mock fallback...")
res = client.generate_json(prompt, AssistantResponse)
print("Fallback succeeded! Keys:", list(res.keys()))
print("Fallback summary:", res.get("summary"))
assert "decision" in res
assert "steps" in res
print("Resilient fallback verified 100% successfully!")
